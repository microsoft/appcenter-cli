import { AppCenterClient } from "../../util/apis";
import { AppCommand, CommandResult } from "../../util/commandline";
import { ErrorCodes, failure, success } from "../../util/commandline";
import { hasArg, help, longName, shortName } from "../../util/commandline";
import { out } from "../../util/interaction";
import { inspect } from "util";
import { DefaultApp } from "../../util/profile";
import UploadSymbolsHelper from "./lib/symbols-uploading-helper";
import { getSymbolsZipFromXcarchive, packDsymParentFolderContents, getChildrenDsymFolderPaths } from "./lib/subfolder-symbols-helper";
import { createTempFileFromZip } from "./lib/temp-zip-file-helper";
import { SymbolType } from "./lib/symbols-uploading-helper";

import * as Fs from "fs";
import * as Pfs from "../../util/misc/promisfied-fs";
import * as Path from "path";

import * as JsZip from "jszip";
import * as JsZipHelper from "../../util/misc/jszip-helper";
import * as _ from "lodash";

const debug = require("debug")("appcenter-cli:commands:apps:crashes:upload-symbols");

enum SymbolFsEntryType {
  Unknown,
  DsymFolder,
  DsymParentFolder,
  XcArchive,
  ZipFile
}

@help("Upload the crash symbols for the application")
export default class UploadSymbols extends AppCommand {
  @help("Path to a dSYM package, a directory containing dSYM packages, or a zip file containing the dSYM packages.")
  @shortName("s")
  @longName("symbol")
  @hasArg
  public symbolsPath: string;

  @help("Path to a xcarchive package")
  @shortName("x")
  @longName("xcarchive")
  @hasArg
  public xcarchivePath: string;

  @help("Path to a React Native sourcemap file. Only supported in combination with --symbol or --xcarchive")
  @shortName("m")
  @longName("sourcemap")
  @hasArg
  public sourceMapPath: string;

  @help("Path to a zip file containing Breakpad symbols.")
  @shortName("b")
  @longName("breakpad")
  @hasArg
  public breakpadPath: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    this.validateParameters();

    let zip: JsZip | string; // it is either JsZip object or path to ZIP file
    let symbolType: SymbolType;
    if (!_.isNil(this.symbolsPath)) {
      // processing -s switch value
      zip = await out.progress("Preparing ZIP with symbols...", this.prepareZipFromSymbols(this.symbolsPath));
      symbolType = SymbolType.Apple;
    } else if (!_.isNil(this.breakpadPath)) {
      zip = await out.progress("Preparing ZIP with Breakpad symbols...", this.prepareZipFromSymbols(this.breakpadPath));
      symbolType = SymbolType.Breakpad;
    } else {
      // process -x switch value
      zip = await out.progress("Preparing ZIP with symbols from xcarchive...", this.prepareZipFromXcArchive(this.xcarchivePath));
      symbolType = SymbolType.Apple;
    }

    // process -m switch if specified
    if (!_.isNil(this.sourceMapPath)) {
      // load current ZIP, add/replace symbol file, return stream to new zip
      zip = await out.progress("Adding source map file to ZIP...", this.addSourceMapFileToZip(this.sourceMapPath, zip));
    }

    let pathToZipToUpload: string;
    if (typeof(zip) === "string") {
      // path to zip can be passed as it is
      pathToZipToUpload = zip;
    } else {
      // JsZip object should be written to temp file first
      pathToZipToUpload = await createTempFileFromZip(zip);
    }

    // upload symbols
    await out.progress("Uploading symbols...", new UploadSymbolsHelper(client, app, debug).uploadSymbolsArtifact(pathToZipToUpload, { symbolType }));

    return success();
  }

  private getStatsForFsPath(filePath: string): Fs.Stats | null {
    // take fs entry stats (and check it's existence BTW)
    try {
      debug(`Getting FS statistics for ${filePath}`);
      return Fs.statSync(filePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        // path points to non-existing file system entry
        throw failure(ErrorCodes.InvalidParameter, `path ${filePath} points to non-existent item`);
      } else {
        // other errors
        debug(`Failed to get statistics for file system entry ${filePath} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to get statistics for file system entry ${filePath}`);
      }
    }
  }

  private detectSymbolsFsEntryType(filePath: string, fsEntryStats: Fs.Stats): SymbolFsEntryType {
    if (fsEntryStats.isDirectory()) {
      // check if it is a dSYM or xcarchive directory
      switch (this.getLowerCasedFileExtension(filePath)) {
        case ".dsym":
          return SymbolFsEntryType.DsymFolder;
        case ".xcarchive":
          return SymbolFsEntryType.XcArchive;
        default:
          // test if folder contains .dsym sub-folders
          return getChildrenDsymFolderPaths(filePath, debug).length > 0 ? SymbolFsEntryType.DsymParentFolder : SymbolFsEntryType.Unknown;
      }
    } else if (fsEntryStats.isFile()) {
      // check if it is a ZIP file
      return this.getLowerCasedFileExtension(filePath) === ".zip" ? SymbolFsEntryType.ZipFile : SymbolFsEntryType.Unknown;
    }

    // everything else
    return SymbolFsEntryType.Unknown;
  }

  private getLowerCasedFileExtension(filePath: string): string {
    return Path.extname(filePath).toLowerCase();
  }

  private async packDsymFolder(pathToFolder: string): Promise<JsZip> {
    debug(`Compressing the specified folder ${pathToFolder} to the in-memory ZIP archive`);
    const zipArchive = new JsZip();
    try {
      await JsZipHelper.addFolderToZipRecursively(pathToFolder, zipArchive);
    } catch (error) {
      debug(`Unable to add folder ${pathToFolder} to the ZIP archive - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `unable to add folder ${pathToFolder} to the ZIP archive`);
    }
    return zipArchive;
  }

  private async prepareZipFromSymbols(path: string): Promise<JsZip | string> {
    debug("Trying to prepare ZIP file from symbols");
    const fsEntryStats = this.getStatsForFsPath(path);
    const symbolsType = this.detectSymbolsFsEntryType(path, fsEntryStats);
    switch (symbolsType) {
      case SymbolFsEntryType.DsymFolder:
        // dSYM Folder needs to be packed to the temp ZIP before uploading
        return await this.packDsymFolder(path);
      case SymbolFsEntryType.DsymParentFolder:
        // only child DSYM folders should be compressed
        return await packDsymParentFolderContents(path, debug);
      case SymbolFsEntryType.ZipFile:
        // *.ZIP file can be uploaded as it is
        return path;
      default:
        // file doesn't points to correct symbols
        throw failure(ErrorCodes.InvalidParameter, `${path} is not a valid symbols file/directory`);
    }
  }

  private validateParameters() {
    // check that user have selected either --symbol or --xcarchive
    if (_.isNil(this.symbolsPath) && _.isNil(this.xcarchivePath) && _.isNil(this.breakpadPath)) {
      throw failure(ErrorCodes.InvalidParameter, "specify either '--symbol', '--xcarchive', or '--breakpad' switch");
    } else if (!_.isNil(this.symbolsPath) && !_.isNil(this.xcarchivePath)) {
      throw failure(ErrorCodes.InvalidParameter, "'--symbol' and '--xcarchive' switches are mutually exclusive");
    } else if (!_.isNil(this.symbolsPath) && !_.isNil(this.breakpadPath)) {
      throw failure(ErrorCodes.InvalidParameter, "'--symbol' and '--breakpad' switches are mutually exclusive");
    } else if (!_.isNil(this.xcarchivePath) && !_.isNil(this.breakpadPath)) {
      throw failure(ErrorCodes.InvalidParameter, "'--xcarchive' and '--breakpad' switches are mutually exclusive");
    } else if (!_.isNil(this.breakpadPath) && !_.isNil(this.sourceMapPath)) {
      throw failure(ErrorCodes.InvalidParameter, "'--breakpad' and '--sourcemap' switches are mutually exclusive");
    }
  }

  private async addSourceMapFileToZip(path: string, zip: JsZip | string): Promise<JsZip> {
    debug("Checking if the specified mappings file is valid");

    // checking if it points to the *.map file
    if (this.getLowerCasedFileExtension(path) !== ".map") {
      throw failure(ErrorCodes.InvalidParameter, `${path} is not a map file`);
    }

    // getting statistics for the map file
    const sourceMapFileStats: Fs.Stats = this.getStatsForFsPath(path);

    // checking if source map file is actually a file
    if (!sourceMapFileStats.isFile()) {
      throw failure(ErrorCodes.InvalidParameter, `${path} is not a file`);
    }

    let zipToChange: JsZip;
    if (typeof(zip) === "string") {
      // loading ZIP to add file to it
      debug("Loading ZIP into the memory to add files");
      try {
        const mapFileContent = await Pfs.readFile(zip);
        zipToChange = await new JsZip().loadAsync(mapFileContent);
      } catch (error) {
        debug(`Failed to load ZIP ${zip} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to load ZIP ${zip}`);
      }
    } else {
      // ZIP is already loaded, working with it
      zipToChange = zip;
    }

    // adding (or replacing) source map file
    const sourceMapFileBaseName = Path.basename(path);
    debug(zipToChange.file(sourceMapFileBaseName) ? "Replacing existing mappings file with the same name in the ZIP" : "Adding the specified mappings file to the ZIP");
    try {
      const sourceMapFileBuffer = await Pfs.readFile(path);
      zipToChange.file(sourceMapFileBaseName, sourceMapFileBuffer);
      return zipToChange;
    } catch (error) {
      debug(`Unable to add file ${path} to the ZIP - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `unable to add file ${path} to the ZIP`);
    }
  }

  private async prepareZipFromXcArchive(path: string): Promise<JsZip> {
    debug(`Trying to prepare the ZIP archive with symbols from .xcarchive folder`);
    const fsEntryStats = this.getStatsForFsPath(path);
    const symbolsType = this.detectSymbolsFsEntryType(path, fsEntryStats);
    switch (symbolsType) {
      case SymbolFsEntryType.XcArchive:
        // the DSYM folders from "*.xcarchive/dSYMs" should be compressed
        return await getSymbolsZipFromXcarchive(path, debug);
      default:
        // file doesn't points to correct .xcarchive
        throw failure(ErrorCodes.InvalidParameter, `${path} is not a valid XcArchive folder`);
    }
  }
}
