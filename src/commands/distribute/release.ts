import { AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success, failed } from "../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import * as Request from "request";
import * as Path from "path";
import * as Pfs from "../../util/misc/promisfied-fs";
import { DefaultApp } from "../../util/profile";
import FileUploadClient, { IFileUploadClientSettings, IProgress, IUploadResults, MessageLevel } from "appcenter-file-upload-client";
import { UploadProgress } from "../../util/apis/generated/models/index";
import { fail } from "assert";
import { setTimeout } from "timers";

var ProgressBar = require('progress');

const debug = require("debug")("appcenter-cli:commands:distribute:release");

@help("Upload release binary and trigger distribution")
export default class ReleaseBinaryCommand extends AppCommand {
  @help("Path to binary file")
  @shortName("f")
  @longName("file")
  @required
  @hasArg
  public filePath: string;

  @help("Distribution group name")
  @shortName("g")
  @longName("group")
  @required
  @hasArg
  public distributionGroup: string;

  @help("Release notes text")
  @shortName("r")
  @longName("release-notes")
  @hasArg
  public releaseNotes: string;

  @help("Path to release notes file")
  @shortName("R")
  @longName("release-notes-file")
  @hasArg
  public releaseNotesFile: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    out.init_progressBar('Uploading a new release [:bar] :percent');
    const app: DefaultApp = this.app;

    this.validateParameters();

    // load release notes file or use provided release notes if none was specified
    const releaseNotesString = await this.getReleaseNotesString();

    // get number of distribution group users (and check distribution group existence)
    // return null if request has failed because of any reason except non-existing group name.
    const distributionGroupUsersCount = await this.getDistributionGroupUsersCount(client);

    const createdReleaseUpload = await this.createReleaseUpload(client, app);

    const fileUploadClient = new FileUploadClient();
    const uploadSetting: IFileUploadClientSettings =  {
      assetId: createdReleaseUpload.assetId,
      assetDomain: createdReleaseUpload.assetDomain,
      assetToken: createdReleaseUpload.assetToken,
      file: this.filePath,
      onProgressChanged: (progressData: IProgress) => {
        let convertedValue = progressData.percentCompleted * 0.7 * 0.01
        out.progressBar(convertedValue);
      }
    };
    const uploadResult = await fileUploadClient.upload(uploadSetting);
    let uploadProgress: models.UploadProgress;
    while (!uploadProgress || uploadProgress.progress !== 100) {
      uploadProgress = await this.processUploadedFile(client, app, uploadResult.assetId);
      let convertedProgressValue = 0.7 + uploadProgress.progress * 0.01 * 0.3; 
      out.progressBar(convertedProgressValue);
    }
    const releaseDetails = await this.distributeRelease(client, app, uploadProgress.releaseId, releaseNotesString);
    if (_.isNull(distributionGroupUsersCount)) {
      out.text((rd) => `Release ${rd.shortVersion} (${rd.version}) was successfully released to ${this.distributionGroup}`, releaseDetails);
    } else {
      out.text((rd) => `Release ${rd.shortVersion} (${rd.version}) was successfully released to ${distributionGroupUsersCount} testers in ${this.distributionGroup}`, releaseDetails);
    }
    return success();
  }

  private validateParameters(): void {
    if (!_.isNil(this.releaseNotes) && !_.isNil(this.releaseNotesFile)) {
      throw failure(ErrorCodes.InvalidParameter, "'--release-notes' and '--release-notes-file' switches are mutually exclusive");
    }
  }

  private async getReleaseNotesString(): Promise<string> {
    if (!_.isNil(this.releaseNotesFile)) {
      try {
        return await Pfs.readFile(this.releaseNotesFile, "utf8");
      } catch (error) {
        if (error.code === "ENOENT") {
          throw failure(ErrorCodes.InvalidParameter, `release notes file '${this.releaseNotesFile}' doesn't exist`);
        } else {
          throw error;
        }
      }
    } else {
      return this.releaseNotes;
    }
  }

  private async getDistributionGroupUsersCount(client: AppCenterClient): Promise<number> {
    let distributionGroupUsersRequestResponse: ClientResponse<models.DistributionGroupUserGetResponse[]>;
    try {
      distributionGroupUsersRequestResponse = await clientRequest<models.DistributionGroupUserGetResponse[]>(
        (cb) => client.distributionGroups.listUsers(this.app.ownerName, this.app.appName, this.distributionGroup, cb));
      const statusCode = distributionGroupUsersRequestResponse.response.statusCode;
      if (statusCode >= 400) {
        throw statusCode;
      }
    } catch (error) {
      if (error === 404) {
        throw failure(ErrorCodes.InvalidParameter, `distribution group ${this.distributionGroup} was not found`);
      } else {		
        throw failure(ErrorCodes.Exception, `internal server error`);
      }
    }
    return distributionGroupUsersRequestResponse.result.length;
  }

  private async createReleaseUpload(client: AppCenterClient, app: DefaultApp): Promise<models.ReleaseUploadBeginResponse> {
    let createReleaseUploadRequestResponse: ClientResponse<models.ReleaseUploadBeginResponse>;
    try {
      createReleaseUploadRequestResponse = await clientRequest<models.ReleaseUploadBeginResponse>((cb) => client.releaseUploads.create(
        app.ownerName, app.appName, cb));
    } catch (error) {
      throw failure(ErrorCodes.Exception, `failed to create release upload for ${this.filePath}`);
    }

    return createReleaseUploadRequestResponse.result;
  }

  private async processUploadedFile(client: AppCenterClient, app: DefaultApp, assetId: string): Promise<models.UploadProgress> {
    let uploadProgressResponse: ClientResponse<models.UploadProgress>;
    try {
      uploadProgressResponse = await clientRequest<models.UploadProgress>((cb) => client.releaseUploads.get(assetId, 
        app.ownerName, 
        app.appName, 
        cb));
    } catch (error) {
      if (error === 400) {
        throw failure(ErrorCodes.Exception, `failed to process the package`);
      } else {
        throw failure(ErrorCodes.Exception, `internal server error`);
      }
    }
    return uploadProgressResponse.result;
  }

  private async distributeRelease(client: AppCenterClient, app: DefaultApp, releaseId: number, releaseNotesString: string): Promise<models.ReleaseDetailsResponse> {
    let updateReleaseRequestResponse: ClientResponse<models.ReleaseDetailsResponse>;
    try {
      updateReleaseRequestResponse = await out.progress(`Distributing the release...`,
        clientRequest<models.ReleaseDetailsResponse>(async (cb) => client.releases.update(releaseId, {
          distributionGroupName: this.distributionGroup,
          releaseNotes: releaseNotesString
        }, app.ownerName, app.appName, cb)));
      const statusCode = updateReleaseRequestResponse.response.statusCode;
      if (statusCode >= 400) {
        throw statusCode;
      }
    } catch (error) {
      if (error === 400) {
        throw failure(ErrorCodes.Exception, "changing distribution group is not supported");
      } else {
        debug(`Failed to distribute the release - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to set distribution group and release notes for release ${releaseId}`);
      }
    }
    return updateReleaseRequestResponse.result;
  }
}
