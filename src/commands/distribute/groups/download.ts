import { AppCommand, CommandResult, help, success, failure, shortName, longName, required, hasArg, ErrorCodes } from "../../../util/commandline";
import { AppCenterClient, clientRequest, models } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { DefaultApp } from "../../../util/profile";
import { cwd } from "process";
import * as Path from "path";
import * as _ from "lodash";
import * as MkDirP from "mkdirp";
import { inspect } from "util";
import * as Url from "url";
import * as Request from "request";
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

    let downloadUrl: string;
    if (!_.isNil(this.releaseId)) {
      // distribute.getReleaseForDistributionGroup doesn't support the specific release id now, using two parallel requests instead
      const validateReleaseBelongsToReleaseGroup = this.verifyReleaseBelongsToDistributionGroup(client, app, Number(this.releaseId), this.distributionGroup);
      const releaseUrl = this.getReleaseUrl(client, app, this.releaseId);

      // showing spinner while getting download url and verifying that the specified release was distributed to this distribution group
      await out.progress("Getting release URL...", Promise.all([validateReleaseBelongsToReleaseGroup, releaseUrl]));
      downloadUrl = await releaseUrl;
    } else {
      // using distribute.getReleaseForDistributionGroup for getting latest release
      downloadUrl = await out.progress("Getting release URL...", this.getLastReleaseUrl(client, app, this.distributionGroup));
    }

    const directoryPath = await this.getDirectoryPath(this.directory);
    const filePath = this.getFileFullPath(this.fileName, directoryPath, app.appName, downloadUrl);

    await out.progress("Downloading release...", this.downloadReleasePackageToFile(downloadUrl, filePath));
    out.text((obj) => `Release was saved to ${obj.path}`, {path: filePath});

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

  private async verifyReleaseBelongsToDistributionGroup(client: AppCenterClient, app: DefaultApp, releaseId: number, distributionGroup: string) {
    debug("Verifying that release was distributed to the specified distribution group");
    let releasesIds: number[];
    try {
      const httpRequest = await clientRequest<models.BasicReleaseDetailsResponse[]>((cb) => client.releases.listByDistributionGroup(distributionGroup, app.ownerName, app.appName, cb));
      if (httpRequest.response.statusCode >= 400) {
        throw httpRequest.response.statusCode;
      } else {
        releasesIds = httpRequest.result.map((details) => details.id);
      }
    } catch (error) {
      if (error === 404) {
        throw failure(ErrorCodes.InvalidParameter, `distribution group ${distributionGroup} doesn't exist`);
      } else {
        debug(`Failed to get list of the releases for the distribution group - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to get the list of the releases for the distribution group");
      }
    }

    if (releasesIds.indexOf(releaseId) === -1) {
      throw failure(ErrorCodes.InvalidParameter, `release ${releaseId} was not distributed to distribution group ${distributionGroup}`);
    }
  }

  private async getReleaseUrl(client: AppCenterClient, app: DefaultApp, releaseId: string): Promise<string> {
    debug("Getting download URL for the specified release");
    try {
      const httpRequest = await clientRequest<models.ReleaseDetailsResponse>((cb) => client.releases.getLatestByUser(releaseId, app.ownerName, app.appName, cb));
      if (httpRequest.response.statusCode >= 400) {
        throw httpRequest.response.statusCode;
      } else {
        return httpRequest.result.downloadUrl;
      }
    } catch (error) {
      if (error === 404) {
        throw failure(ErrorCodes.InvalidParameter, `release ${releaseId} doesn't exist`);
      } else {
        debug(`Failed to get details for release ${releaseId} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to get details of the release");
      }
    }
  }

  private async getLastReleaseUrl(client: AppCenterClient, app: DefaultApp, distributionGroup: string): Promise<string> {
    debug("Getting download URL for the latest release of the specified distribution group");
    try {
      const httpRequest = await clientRequest<models.ReleaseDetailsResponse>((cb) =>
        client.releases.getLatestByDistributionGroup(app.ownerName, app.appName, distributionGroup, "latest", cb));
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
          debug(`Failed to get details of the latest release for distribution group ${distributionGroup} - ${inspect(error)}`);
          throw failure(ErrorCodes.Exception, "failed to get details of the latest release for the distribution group");
      }
    }
  }

  private getDirectoryPath(directoryPath: string): Promise<string> {
    if (!_.isNil(directoryPath)) {
      const normalizedPath = Path.normalize(directoryPath);

      debug("Checking that specified directories exist and creating them if not");
      return new Promise<string> ((resolve, reject) => {
        MkDirP(normalizedPath, (error: NodeJS.ErrnoException) => {
          if (!_.isNil(error)) {
            if (error.code === "EEXIST") {
              reject(failure(ErrorCodes.InvalidParameter, `file ${directoryPath} already exists - directory path is expected`));
            } else {
              debug(`Failed to create/access directory ${directoryPath} - ${inspect(error)}`);
              reject(failure(ErrorCodes.Exception, `failed to create/access directory ${directoryPath}`));
            }
          } else {
            resolve(normalizedPath);
          }
        });
      });
    } else {
      // using current working directory by default
      return Promise.resolve(cwd());
    }
  }

  private getFileFullPath(passedFileName: string, directoryPath: string, appName: string, downloadUrl: string): string {
    if (_.isNil(passedFileName)) {
      // creating default file name from app name and "format" query key value of download url
      const ext = "." + Url.parse(downloadUrl, true).query.format as string;
      const name = appName;
      return Path.format({ dir: directoryPath, name, ext, base: null, root: null });
    } else {
      return Path.join(directoryPath, passedFileName);
    }
  }

  private downloadReleasePackageToFile(downloadUrl: string, filePath: string): Promise<void> {
    debug("Downloading the release package to the path");
    return new Promise<void>((resolve, reject) => {
      Request.get(downloadUrl)
      .on("error", (error) => {
        debug(`Failed to download the release from ${downloadUrl} - ${inspect(error)}`);
        reject(failure(ErrorCodes.Exception, `failed to download the release from ${downloadUrl}`));
      })
      .pipe(
        Fs.createWriteStream(filePath)
        .on("error", (error: Error) => {
          debug(`Failed to save the release to ${filePath} - ${inspect(error)}`);
          reject(failure(ErrorCodes.Exception, `failed to save the release to ${filePath}`));
        })
        .on("finish", () => resolve()));
    });
  }
}
