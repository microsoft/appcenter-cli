import {
  AppCommand,
  CommandResult,
  help,
  success,
  failure,
  shortName,
  longName,
  required,
  hasArg,
  ErrorCodes,
} from "../../../util/commandline";
import { AppCenterClient, clientRequest, models } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { DefaultApp } from "../../../util/profile";
import { cwd } from "process";
import * as Path from "path";
import * as _ from "lodash";
import * as mkdirp from "mkdirp";
import { inspect } from "util";
import * as Url from "url";
import fetch from 'node-fetch';
import * as Fs from "fs";

const debug = require("debug")("appcenter-cli:commands:distribute:groups:download");

@help("Download release package for the distribution group")
export default class DownloadBinaryFromDistributionGroupCommand extends AppCommand {
  @help("Distribution group name")
  @shortName("g")
  @longName("group")
  @required
  @hasArg
  public distributionGroup: string;

  @help("Release ID")
  @shortName("i")
  @longName("id")
  @hasArg
  public releaseId: string;

  @help("Name of the destination file")
  @shortName("f")
  @longName("filename")
  @hasArg
  public fileName: string;

  @help("Directory path for the destination file")
  @shortName("d")
  @longName("dest")
  @hasArg
  public directory: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    // test that optional release id is a positive integer and optional file name is valid
    this.validateParameters();

    const downloadUrl: string = await out.progress(
      "Getting release URL...",
      this.getReleaseUrl(client, app, !_.isNil(this.releaseId) ? this.releaseId : "latest", this.distributionGroup)
    );

    const directoryPath = await this.getDirectoryPath(this.directory);
    const filePath = this.getFileFullPath(this.fileName, directoryPath, downloadUrl);

    await out.progress("Downloading release...", this.downloadReleasePackageToFile(downloadUrl, filePath));
    out.text((obj) => `Release was saved to ${obj.path}`, { path: filePath });

    return success();
  }

  private validateParameters() {
    if (!_.isNil(this.releaseId)) {
      const releaseIdNumber = Number(this.releaseId);
      if (!Number.isSafeInteger(releaseIdNumber) || !(releaseIdNumber > 0)) {
        throw failure(ErrorCodes.InvalidParameter, `${this.releaseId} is not a valid release id`);
      }
    }

    if (!_.isNil(this.fileName) && this.fileName !== Path.basename(this.fileName)) {
      throw failure(ErrorCodes.InvalidParameter, `file name ${this.fileName} is not valid`);
    }
  }

  private async getReleaseUrl(
    client: AppCenterClient,
    app: DefaultApp,
    releaseId: string,
    distributionGroup: string
  ): Promise<string> {
    debug(`Getting download URL for the ${releaseId} release of the specified distribution group`);
    try {
      const httpRequest = await clientRequest<models.ReleaseDetailsResponse>((cb) =>
        client.releasesOperations.getLatestByDistributionGroup(app.ownerName, app.appName, distributionGroup, releaseId, cb)
      );
      if (httpRequest.response.statusCode >= 400) {
        throw httpRequest.result;
      } else {
        return httpRequest.result.downloadUrl;
      }
    } catch (error) {
      switch (error.code) {
        case "no_releases_for_app":
          throw failure(ErrorCodes.InvalidParameter, `there were no releases for the distribution group ${distributionGroup}`);
        case "not_found":
          throw failure(ErrorCodes.InvalidParameter, `distribution group ${distributionGroup} doesn't exist`);
        default:
          debug(`Failed to get details of the ${releaseId} release for distribution group ${distributionGroup} - ${inspect(error)}`);
          throw failure(ErrorCodes.Exception, `failed to get details of the ${releaseId} release for the distribution group`);
      }
    }
  }

  private async getDirectoryPath(directoryPath: string): Promise<string> {
    if (!_.isNil(directoryPath)) {
      const normalizedPath = Path.normalize(directoryPath);

      debug("Checking that specified directories exist and creating them if not");
      try {
        await mkdirp(normalizedPath);
        return normalizedPath;
      } catch (error) {
        if (error.code === "EEXIST") {
          throw failure(ErrorCodes.InvalidParameter, `file ${directoryPath} already exists - directory path is expected`);
        } else {
          debug(`Failed to create/access directory ${directoryPath} - ${inspect(error)}`);
          throw failure(ErrorCodes.Exception, `failed to create/access directory ${directoryPath}`);
        }
      }
    } else {
      // using current working directory by default
      return Promise.resolve(cwd());
    }
  }

  private getFilenameFromDownloadUrl(downloadUrl: string): string {
    const filename = Url.parse(downloadUrl).pathname?.split("/").slice(-1)[0];
    debug(`Got filename from URL: ${filename}`);
    return filename;
  }

  private getFileFullPath(passedFileName: string, directoryPath: string, downloadUrl: string): string {
    if (_.isNil(passedFileName)) {
      const name = this.getFilenameFromDownloadUrl(downloadUrl);
      return Path.format({ dir: directoryPath, name, base: null, root: null });
    } else {
      return Path.join(directoryPath, passedFileName);
    }
  }

  private downloadReleasePackageToFile(downloadUrl: string, filePath: string): Promise<void> {
    debug("Downloading the release package to the path");


    return fetch(downloadUrl).then(response => new Promise<void>((resolve, reject) => {
      const dest = Fs.createWriteStream(filePath);
      response.body.pipe(dest);
      response.body.on("end", () => {
        resolve()
      });
      dest.on("error", (error) => {
        debug(`Failed to save the release to ${filePath} - ${inspect(error)}`);
        reject(failure(ErrorCodes.Exception, `failed to save the release to ${filePath}`))
      });
    })).catch((error) => {
      debug(`Failed to download the release from ${downloadUrl} - ${inspect(error)}`);
      return new Promise<void>((_resolve, reject) => {
        reject(failure(ErrorCodes.Exception, `failed to download the release from ${downloadUrl}`))
      });
    });
  }
}
