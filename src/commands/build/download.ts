import { AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success } from "../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import * as Process from "process";
import * as Request from "request";
import * as JsZip from "jszip";
import * as JsZipHelper from "../../util/misc/jszip-helper";
import * as Path from "path";
import * as Pfs from "../../util/misc/promisfied-fs";
import { DefaultApp } from "../../util/profile";

const debug = require("debug")("appcenter-cli:commands:build:download");

@help("Download the binary, logs or symbols for a completed build")
export default class DownloadBuildStatusCommand extends AppCommand {
  private static readonly applicationPackagesExtensions: string[] = [".apk", ".aar", ".ipa", ".xcarchive"];

  private static readonly buildType = "build";
  private static readonly logsType = "logs";
  private static readonly symbolsType = "symbols";

  private static readonly failedResult = "failed";

  private static readonly completedStatus = "completed";

  @help("ID of build to download")
  @shortName("i")
  @longName("id")
  @required
  @hasArg
  public buildId: string;

  @help(`Type of download. '${DownloadBuildStatusCommand.buildType}', '${DownloadBuildStatusCommand.logsType}', and '${DownloadBuildStatusCommand.symbolsType}' are allowed values`)
  @shortName("t")
  @longName("type")
  @required
  @hasArg
  public type: string;

  @help("Destination path. Optional parameter to override the default destination path of the downloaded build")
  @shortName("d")
  @longName("dest")
  @hasArg
  public directory: string;

  @help("Destination file. Optional parameter to override the default auto-generated file name")
  @shortName("f")
  @longName("file")
  @hasArg
  public file: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    this.type = this.getNormalizedTypeValue(this.type);

    const buildIdNumber = this.getNormalizedBuildId(this.buildId);

    // set directory to current if it is not specified
    if (_.isNil(this.directory)) {
      this.directory = Process.cwd();
    }

    const app = this.app;

    debug(`Getting build status`);
    const buildInfo = await this.getBuildStatus(client, app, buildIdNumber);

    debug(`Getting download URL for ${this.type}`);
    const uri = await this.getDownloadUri(client, app, buildIdNumber);

    debug(`Downloading content from ${uri}`);
    const downloadedContent = await this.downloadContent(uri);

    debug(`Creating (if necessary) destination folder ${this.directory}`);
    await out.progress("Creating destination folder... ", Pfs.mkdirp(this.directory));

    let outputPath: string;
    if (this.type === DownloadBuildStatusCommand.buildType) {
      debug("Reading received ZIP archive");
      const zip = await out.progress("Reading downloaded ZIP...", new JsZip().loadAsync(downloadedContent));
      const payloadZipEntry = this.getPayload(zip);
      const extension = Path.extname(payloadZipEntry.name).substring(1);

      if (payloadZipEntry.dir) {
        // xcarchive
        outputPath = await out.progress("Unpacking .xcarchive folder...", this.unpackAndWriteDirectory(zip, extension, buildInfo.sourceBranch, payloadZipEntry.name));
      } else {
        // IPA or APK
        const payload = await out.progress("Extracting application package...", payloadZipEntry.async("nodebuffer"));
        outputPath = await out.progress("Writing application package...", this.writeFile(payload, extension, buildInfo.sourceBranch));
      }
    } else {
      outputPath = await this.writeFile(downloadedContent, "zip", buildInfo.sourceBranch);
    }

    out.text((pathObject) => `Downloaded content was saved to ${pathObject.path}`,  {path: Path.resolve(outputPath)});

    return success();
  }

  private downloadFile(uri: string): Promise<ClientResponse<Buffer>> {
    return new Promise<ClientResponse<Buffer>>((resolve, reject) => {
      Request.get(uri, {encoding: null}, (error, response, body: Buffer) => {
        if (error) {
          reject(error);
        } else {
          resolve({result: body, response});
        }
      });
    });
  }

  private async generateNameForOutputFile(branchName: string, extension: string): Promise<string> {
    if (this.file) {
      return this.file.includes(extension) ? this.file : `${this.file}.${extension}`;
    }

    // file name should be unique for the directory
    const filesInDirectory = (await Pfs.readdir(this.directory)).map((name) => name.toLowerCase());
    let id = 1;
    let newFileName: string;
    do {
      newFileName = `${this.type}_${branchName}_${this.buildId}_${id++}.${extension}`;
    }
    while (_.includes(filesInDirectory, newFileName.toLowerCase()));

    return newFileName;
  }

  private getNormalizedTypeValue(type: string): string {
    const lowerCaseType = type.toLowerCase();
    if (lowerCaseType !== DownloadBuildStatusCommand.buildType
          && lowerCaseType !== DownloadBuildStatusCommand.logsType
          && lowerCaseType !== DownloadBuildStatusCommand.symbolsType) {
      throw failure(ErrorCodes.InvalidParameter,
        `download type should be '${DownloadBuildStatusCommand.buildType}', '${DownloadBuildStatusCommand.logsType}' or '${DownloadBuildStatusCommand.symbolsType}'`);
    }

    return lowerCaseType;
  }

  private getNormalizedBuildId(buildId: string): number {
    const buildIdNumber = Number(this.buildId);
    if (!Number.isSafeInteger(buildIdNumber) || buildIdNumber < 1) {
      throw failure(ErrorCodes.InvalidParameter, "build id should be positive integer");
    }

    return buildIdNumber;
  }

  private async getBuildStatus(client: AppCenterClient, app: DefaultApp, buildIdNumber: number): Promise<models.Build> {
    let buildStatusRequestResponse: ClientResponse<models.Build>;
    try {
      buildStatusRequestResponse = await out.progress(`Getting status of build ${this.buildId}...`,
        clientRequest<models.Build>((cb) => client.builds.get(buildIdNumber, app.ownerName, app.appName, cb)));
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `build ${buildIdNumber} was not found`);
      } else {
        debug(`Request failed - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to get status of build ${this.buildId}`);
      }
    }

    const buildInfo = buildStatusRequestResponse.result;

    if (buildInfo.status !== DownloadBuildStatusCommand.completedStatus) {
      throw failure(ErrorCodes.InvalidParameter, `cannot download ${this.type} for an uncompleted build`);
    }
    if (buildInfo.result === DownloadBuildStatusCommand.failedResult && this.type !== DownloadBuildStatusCommand.logsType) {
      throw failure(ErrorCodes.InvalidParameter, `no ${this.type} to download - build failed`);
    }

    return buildInfo;
  }

  private async getDownloadUri(client: AppCenterClient, app: DefaultApp, buildIdNumber: number): Promise<string> {
    let downloadDataResponse: ClientResponse<models.DownloadContainer>;
    try {
      downloadDataResponse = await out.progress(`Getting ${this.type} download URL for build ${this.buildId}...`,
        clientRequest<models.DownloadContainer>((cb) => client.builds.getDownloadUri(buildIdNumber, this.type, app.ownerName, app.appName, cb)));
    } catch (error) {
      debug(`Request failed - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `failed to get ${this.type} downloading URL for build ${this.buildId}`);
    }

    return downloadDataResponse.result.uri;
  }

  private async downloadContent(uri: string): Promise<Buffer> {
    let downloadFileRequestResponse: ClientResponse<Buffer>;
    try {
      downloadFileRequestResponse = await out.progress(`Loading ${this.type} for build ${this.buildId}...`, this.downloadFile(uri));
    } catch (error) {
      debug(`File download failed - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `failed to load file with ${this.type} for build ${this.buildId}`);
    }

    const statusCode = downloadFileRequestResponse.response.statusCode;
    if (statusCode >= 400) {
      switch (statusCode) {
        case 404:
          throw failure(ErrorCodes.Exception, `unable to find ${this.type} for build ${this.buildId}`);
        default:
          throw failure(ErrorCodes.Exception, `failed to load file with ${this.type} for build ${this.buildId} - HTTP ${statusCode} ${downloadFileRequestResponse.response.statusMessage}`);
      }
    }

    return downloadFileRequestResponse.result;
  }

  private getPayload(zip: JsZip): JsZip.JSZipObject {
    // looking for apk, ipa or xcarchive
    return  _.find(
         _.values(zip.files) as JsZip.JSZipObject[],
        (file) => _.includes(DownloadBuildStatusCommand.applicationPackagesExtensions, Path.extname(file.name).toLowerCase()));
  }

  private async writeFile(buffer: Buffer, extension: string, sourceBranch: string): Promise<string> {
    debug("Preparing name for resulting file");
    const fileName = await this.generateNameForOutputFile(sourceBranch, extension);

    debug(`Writing file ${fileName}`);
    const filePath = Path.join(this.directory, fileName);
    await Pfs.writeFile(filePath, buffer);
    return filePath;
  }

  private async unpackAndWriteDirectory(directoryZip: JsZip, extension: string, sourceBranch: string, root: string): Promise<string> {
    debug("Preparing name for resulting directory");
    const directoryName = await this.generateNameForOutputFile(sourceBranch, extension);

    debug(`Writing xcarchive directory ${directoryName}`);
    const directoryPath: string = Path.join(this.directory, directoryName);
    await Pfs.mkdirp(directoryPath);
    await JsZipHelper.unpackZipToPath(directoryPath, directoryZip, root);
    return directoryPath;
  }
}
