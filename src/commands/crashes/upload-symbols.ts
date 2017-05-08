import { clientRequest, MobileCenterClient, models } from "../../util/apis";
import { AppCommand, CommandArgs, CommandResult} from "../../util/commandline";
import { ErrorCodes, failure, success } from "../../util/commandline";
import { hasArg, help, longName, shortName } from "../../util/commandline";
import { out } from "../../util/interaction";
import { inspect } from "util";
import { DefaultApp } from "../../util/profile";
import UploadSymbolsHelper from "./lib/symbols-uploading-helper";

import * as Fs from "fs";
import * as Pfs from "../../util/misc/promisfied-fs";
import * as Path from "path";

import * as JsZip from "jszip";
import * as JsZipHelper from "../../util/misc/jszip-helper";
import * as _ from "lodash";

const debug = require("debug")("mobile-center-cli:commands:apps:crashes:upload-symbols");

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

  constructor(args: CommandArgs) {
    super(args);
  }

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    this.validateParameters();

    let zip: JsZip;
    if (!_.isNil(this.symbolsPath)) {
      // processing -s switch value
      zip = await out.progress("Preparing ZIP with symbols...", this.prepareZipFromSymbols(this.symbolsPath));
    } else {
      // process -x switch value
      zip = await out.progress("Preparing ZIP with symbols from xcarchive...", this.prepareZipFromXcArchive(this.xcarchivePath));
    }

    // process -m switch if specified
    if (!_.isNil(this.sourceMapPath)) {
      await out.progress("Adding source map file to ZIP...", this.addSourceMapFileToZip(this.sourceMapPath, zip));
    }

    // upload symbols
    await out.progress("Uploading symbols...", new UploadSymbolsHelper(client, app, debug).uploadSymbolsZip(zip));

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
          return this.getChildrenDsymFolderPaths(filePath).length > 0 ? SymbolFsEntryType.DsymParentFolder : SymbolFsEntryType.Unknown;
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

  private async packDsymParentFolderContents(path: string): Promise<JsZip> {
    debug(`Compressing the dSYM sub-folders of ${path} to the in-memory ZIP archive`);
    const zipArchive = new JsZip();
    const childrenDsymFolders = this.getChildrenDsymFolderPaths(path);
    for (const dSymPath of childrenDsymFolders){
      try {
        debug(`Adding the sub-folder ${dSymPath} to the ZIP archive`);
        await JsZipHelper.addFolderToZipRecursively(dSymPath, zipArchive);
      } catch (error) {
        debug(`Unable to add folder ${dSymPath} to the ZIP archive - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `unable to add folder ${dSymPath} to the ZIP archive`);
      }
    }
    return zipArchive;
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

  private async readZipFileToBuffer(pathToZip: string): Promise<JsZip> {
    try {
      debug(`Reading existing ZIP file ${pathToZip} into the memory`);
      let zipFileBuffer = await Pfs.readFile(pathToZip);
      return await new JsZip().loadAsync(zipFileBuffer, { checkCRC32: true });
    } catch (error) {
      debug(`Failed to read ZIP archive - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to read ZIP archive ${pathToZip}");
    }
  }

  private async prepareZipFromSymbols(path: string): Promise<JsZip> {
    debug("Trying to prepare ZIP file from symbols");
    const fsEntryStats = this.getStatsForFsPath(path);
    const symbolsType = this.detectSymbolsFsEntryType(path, fsEntryStats);
    switch (symbolsType) {
      case SymbolFsEntryType.DsymFolder:
        // dSYM Folder needs to be packed to the temp ZIP before uploading
        return await this.packDsymFolder(path);
      case SymbolFsEntryType.DsymParentFolder:
        // only child DSYM folders should be compressed
        return await this.packDsymParentFolderContents(path);
      case SymbolFsEntryType.ZipFile:
        // *.ZIP file can be uploaded as it is
        return await this.readZipFileToBuffer(path);
      default:
        // file doesn't points to correct symbols
        throw failure(ErrorCodes.InvalidParameter, `${path} is not a valid symbols file/directory`);
    }
  }

  private validateParameters() {
    // check that user have selected either --symbol or --xcarchive
    if (_.isNil(this.symbolsPath) && _.isNil(this.xcarchivePath)) {
      throw failure(ErrorCodes.InvalidParameter, "specify either '--symbol' or '--xcarchive' switch");
    } else if (!_.isNil(this.symbolsPath) && !_.isNil(this.xcarchivePath)) {
      throw failure(ErrorCodes.InvalidParameter, "'--symbol' and '--xcarchive' switches are mutually exclusive");
    }
  }

  private getChildrenDsymFolderPaths(parentPath: string): string[] {
    // get paths for all the DSym folders which belong to the specified folder
    let childrenEntriesList: string[];
    try {
      childrenEntriesList = Fs.readdirSync(parentPath);
    } catch (error) {
      debug(`error when looking into directory ${parentPath} content - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `error when looking into directory ${parentPath} content`);
    }

    return childrenEntriesList
      .map((childPath) => Path.join(parentPath, childPath))
      .filter((childPath) => {
          if (this.getLowerCasedFileExtension(childPath) !== ".dsym") {
            return false;
          }
          try {
            let childStats = Fs.statSync(childPath);
            return childStats.isDirectory();
          } catch (error) {
            debug(`Error when getting statistics for the file ${parentPath} - ${inspect(error)}`);
            throw failure(ErrorCodes.Exception, `error when getting statistics for the file ${parentPath}`);
          }
      });
  }

  private async addSourceMapFileToZip(path: string, zip: JsZip): Promise<void> {
      debug("Checking if the specified mappings file is valid");

      // checking if it points to the *.map file
      if (this.getLowerCasedFileExtension(path) !== ".map") {
        throw failure(ErrorCodes.InvalidParameter, `${path} is not a map file`);
      }

      // getting statistics for the map file
      let sourceMapFileStats: Fs.Stats = this.getStatsForFsPath(path);

      // checking if source map file is actually a file
      if (!sourceMapFileStats.isFile()) {
        throw failure(ErrorCodes.InvalidParameter, `${path} is not a file`);
      }

      // adding (or replacing) source map file
      const sourceMapFileBaseName = Path.basename(path);
      debug(zip.file(sourceMapFileBaseName) ? "Replacing existing mappings file with the same name in the ZIP" : "Adding the specified mappings file to the ZIP");
      try {
        let sourceMapFileContent = await Pfs.readFile(path);
        zip.file(sourceMapFileBaseName, sourceMapFileContent);
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
        const dsymsFolderPath = Path.join(path, "dSYMs");
        return await this.packDsymParentFolderContents(dsymsFolderPath);
      default:
        // file doesn't points to correct .xcarchive
        throw failure(ErrorCodes.InvalidParameter, `${path} is not a valid XcArchive folder`);
    }
  }
}

enum SymbolFsEntryType {
  Unknown,
  DsymFolder,
  DsymParentFolder,
  XcArchive,
  ZipFile
}
