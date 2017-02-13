import { clientRequest, MobileCenterClient, models } from "../../util/apis";
import { AppCommand, CommandArgs, CommandResult} from "../../util/commandline";
import { ErrorCodes, failure, success } from "../../util/commandline";
import { hasArg, help, longName, shortName } from "../../util/commandline";
import { out } from "../../util/interaction";
import { DefaultApp } from "../../util/profile";
import { UploadSymbolsError } from "./lib/upload-symbols-error";

import * as Fs from "fs";
import * as Pfs from "../../util/misc/promisfied-fs";
import * as Path from "path";

import * as JsZip from "jszip";
import * as JsZipHelper from "../../util/misc/jszip-helper";
import * as Crypto from "crypto";
import * as _ from "lodash";
import * as Request from "request";

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
    try {
      return await this.executeCommand(client);
    } catch (error) {
      if (error instanceof UploadSymbolsError) {
        return failure(error.errorCode, error.message);
      } else {
        throw error;
      }
    }
  }

  private async executeCommand(client: MobileCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    this.validateParameters();

    let zip: JsZip;
    if (!_.isNil(this.symbolsPath)) {
      // processing -s switch value
      out.text("Creating ZIP with symbols...");
      zip = await this.prepareZipFromSymbols(this.symbolsPath);
    } else {
      // process -x switch value
      out.text("Creating ZIP with symbols from xcarchive...");
      zip = await this.prepareZipFromXcArchive(this.xcarchivePath);
    }

    // process -m switch if specified
    if (!_.isNil(this.sourceMapPath)) {
      out.text("Adding source map file to ZIP...");
      this.addSourceMapFileToZip(this.sourceMapPath, zip);
    }

    // get buffer for the prepared ZIP
    let zipBuffer: Buffer = await this.getZipBuffer(zip);

    // starting ZIP buffer MD5 hash calculation
    let md5Hash: Promise<string> = this.calculateMd5(zipBuffer);

    // executing API request to get an upload URL
    out.text("Executing Symbols Uploading Start API request...");
    let uploadingBeginRequestResult = await this.executeSymbolsUploadingBeginRequest(client, app);
    out.text(`Symbols Uploading Start completed: symbol upload ID - ${uploadingBeginRequestResult.symbolUploadId}`);

    // uploading
    const symbolUploadId = uploadingBeginRequestResult.symbolUploadId;

    try {
      // doing HTTP PUT for ZIP buffer contents to the upload URL
      out.text("Uploading ZIP...");
      const uploadUrl: string = uploadingBeginRequestResult.uploadUrl;
      await this.uploadZipFile(uploadUrl, zipBuffer, await md5Hash);
      out.text("Uploaded");

      // sending 'committed' API request to finish uploading
      out.text("Executing Symbols Uploading End API request...");
      let uploadingEndRequestResult: models.SymbolUpload = await this.executeSymbolsUploadingEndRequest(client, app, symbolUploadId, "committed");
      out.text(`Symbols Uploading End completed: symbol upload status - ${uploadingEndRequestResult.status}`);
    } catch (error) {
      // uploading failed, aborting upload request
      out.text("Uploading failed, executing Symbols Uploading Abort API request...");
      let uploadingAbortRequestResult = await this.abortUploadingRequest(client, app, symbolUploadId);
      out.text(`Symbols Uploading Abort completed: symbol upload status - ${uploadingAbortRequestResult.status}`);
      throw error;
    }

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
        throw new UploadSymbolsError(ErrorCodes.InvalidParameter, `path ${filePath} points to non-existent item`);
      } else {
        // other errors
        throw error;
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
        throw new UploadSymbolsError(ErrorCodes.Exception, `unable to add folder ${dSymPath} to the ZIP archive: ${_.toString(error)}`);
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
      throw new UploadSymbolsError(ErrorCodes.Exception, `unable to add folder ${pathToFolder} to the ZIP archive: ${_.toString(error)}`);
    }
    return zipArchive;
  }

  private async readZipFileToBuffer(pathToZip: string): Promise<JsZip> {
    try {
      debug(`Reading existing ZIP file ${pathToZip} into the memory`);
      let zipFileBuffer = await Pfs.readFile(pathToZip);
      return await new JsZip().loadAsync(zipFileBuffer, { checkCRC32: true });
    } catch (error) {
      throw new UploadSymbolsError(ErrorCodes.Exception, `failed to read ZIP archive ${pathToZip}: ${this.getErrnoExceptionString(error)}`);
    }
  }

  private calculateMd5(buffer: Buffer): Promise<string> {
    return new Promise<string>((resolve) => {
      resolve(Crypto.createHash("md5").update(buffer).digest("base64"));
    });
  }

  private getErrnoExceptionString(error: NodeJS.ErrnoException): string {
    return _.toString(error.message);
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
        throw new UploadSymbolsError(ErrorCodes.InvalidParameter, `${path} is not a valid symbols file/directory`);
    }
  }

  private async executeSymbolsUploadingBeginRequest(client: MobileCenterClient, app: DefaultApp): Promise<models.SymbolUploadBeginResponse> {
    debug("Executing API request to get uploading URL");
    let symbolUploadingBeginRequest = clientRequest<models.SymbolUploadBeginResponse>((cb) => client.crashOperations.postSymbolUpload(
      app.ownerName,
      app.appName,
      "Apple",
      cb)).catch((error: any) => {
          throw new UploadSymbolsError(ErrorCodes.Exception, `failed to start the symbol uploading: ${this.getErrnoExceptionString(error)}`);
      });

    const uploadingBeginResponse = await symbolUploadingBeginRequest;

    debug("Analyzing upload start request response status code");
    const uploadingBeginStatusCode = uploadingBeginResponse.response.statusCode;
    const uploadingBeginStatusMessage = uploadingBeginResponse.response.statusMessage;
    if (uploadingBeginStatusCode >= 400) {
      throw new UploadSymbolsError(ErrorCodes.Exception,
        `the symbol upload begin API request was rejected: HTTP ${uploadingBeginStatusCode} - ${uploadingBeginStatusMessage}`);
    }

    return uploadingBeginResponse.result;
  }

  private uploadZipFile(uploadUrl: string, zippedFileBuffer: Buffer, md5Hash: string): Promise<void> {
    debug("Uploading the prepared ZIP file");
    return new Promise<void>((resolve, reject) => {
      Request.put(uploadUrl, {
        body: zippedFileBuffer,
        headers: {
          "Content-Length": zippedFileBuffer.length,
          "Content-MD5": md5Hash,
          "Content-Type": "application/zip",
          "x-ms-blob-type": "BlockBlob"
        }
      })
      .on("error", (error) => {
        reject(new UploadSymbolsError(ErrorCodes.Exception, `ZIP file uploading failed: ${error.message}`));
      })
      .on("response", (response) => {
        if (response.statusCode < 400) {
          resolve();
        } else {
          reject(new UploadSymbolsError(ErrorCodes.Exception, `ZIP file uploading failed: HTTP ${response.statusCode}`));
        }
      });
    });
  }

  private async executeSymbolsUploadingEndRequest(client: MobileCenterClient, app: DefaultApp, symbolUploadId: string, desiredStatus: SymbolsUploadEndRequestStatus): Promise<models.SymbolUpload> {
    debug(`Finishing symbols uploading with desired status: ${desiredStatus}`);
    let symbolUploadingEndRequest = clientRequest<models.SymbolUpload>((cb) => client.crashOperations.patchSymbolUpload(
      symbolUploadId,
      app.ownerName,
      app.appName,
      desiredStatus,
      cb,
    )).catch((error: any) => {
        throw new UploadSymbolsError(ErrorCodes.Exception,
          `failed to finalize the symbol upload with status '${desiredStatus}': ${this.getErrnoExceptionString(error)}`);
    });

    const uploadingEndResponse = await symbolUploadingEndRequest;
    debug("Analyzing upload end request response status code");
    const uploadingEndStatusCode = uploadingEndResponse.response.statusCode;
    const uploadingEndStatusMessage = uploadingEndResponse.response.statusMessage;
    if (uploadingEndStatusCode >= 400) {
      throw new UploadSymbolsError(ErrorCodes.Exception,
        `the symbol upload end API request was rejected: HTTP ${uploadingEndStatusCode} - ${uploadingEndStatusMessage}`);
    }

    return uploadingEndResponse.result;
  }

  private validateParameters() {
    // check that user have selected either --symbol or --xcarchive
    if (_.isNil(this.symbolsPath) && _.isNil(this.xcarchivePath)) {
      throw new UploadSymbolsError(ErrorCodes.InvalidParameter, "specify either '--symbol' or '--xcarchive' switch");
    } else if (!_.isNil(this.symbolsPath) && !_.isNil(this.xcarchivePath)) {
      throw new UploadSymbolsError(ErrorCodes.InvalidParameter, "'--symbol' and '--xcarchive' switches are mutually exclusive");
    }
  }

  private getChildrenDsymFolderPaths(parentPath: string): string[] {
    // get paths for all the DSym folders which belong to the specified folder
    let childrenEntriesList: string[];
    try {
      childrenEntriesList = Fs.readdirSync(parentPath);
    } catch (error) {
      throw new UploadSymbolsError(ErrorCodes.Exception, `error when looking into directory ${parentPath} content: ${this.getErrnoExceptionString(error)}`);
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
            throw new UploadSymbolsError(ErrorCodes.Exception, `error when getting statistics for the file ${parentPath}: ${this.getErrnoExceptionString(error)}`);
          }
      });
  }

  private addSourceMapFileToZip(path: string, zip: JsZip): void {
      debug("Checking if the specified mappings file is valid");

      // checking if it points to the *.map file
      if (this.getLowerCasedFileExtension(path) !== ".map") {
        throw new UploadSymbolsError(ErrorCodes.InvalidParameter, `${path} is not a map file`);
      }

      // getting statistics for the map file
      let sourceMapFileStats: Fs.Stats = this.getStatsForFsPath(path);

      // checking if source map file is actually a file
      if (!sourceMapFileStats.isFile()) {
        throw new UploadSymbolsError(ErrorCodes.InvalidParameter, `${path} is not a file`);
      }

      // adding (or replacing) source map file
      const sourceMapFileBaseName = Path.basename(path);
      debug(zip.file(sourceMapFileBaseName) ? "Replacing existing mappings file with the same name in the ZIP" : "Adding the specified mappings file to the ZIP");
      try {
        let sourceMapFileContent = Fs.readFileSync(path);
        zip.file(sourceMapFileBaseName, sourceMapFileContent);
      } catch (error) {
        throw new UploadSymbolsError(ErrorCodes.Exception, `unable to add file ${path} to the ZIP`);
      }
  }

  private async getZipBuffer(zip: JsZip): Promise<Buffer> {
    try {
      debug("Getting in-memory ZIP archive as Buffer");
      return await zip.generateAsync({
        type: "nodebuffer"
      });
    } catch (error) {
       throw new UploadSymbolsError(ErrorCodes.Exception, `Failed to compress the ZIP file: ${_.toString(error)}`);
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
        throw new UploadSymbolsError(ErrorCodes.InvalidParameter, `${path} is not a valid XcArchive folder`);
    }
  }

  private async abortUploadingRequest(client: MobileCenterClient, app: DefaultApp, symbolUploadId: string): Promise<models.SymbolUpload> {
    debug("Uploading failed, aborting upload request");
    try {
      return await this.executeSymbolsUploadingEndRequest(client, app, symbolUploadId, "aborted");
    } catch (ex) {
      debug("Failed to correctly abort the uploading request");
      out.text(`Symbols Uploading Abort failed`);
    }
  }
}

type SymbolsUploadEndRequestStatus = "committed" | "aborted";

enum SymbolFsEntryType {
  Unknown,
  DsymFolder,
  DsymParentFolder,
  XcArchive,
  ZipFile
}
