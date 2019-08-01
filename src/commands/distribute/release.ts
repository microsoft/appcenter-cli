import { AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success } from "../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import * as Request from "request";
import * as Path from "path";
import * as Pfs from "../../util/misc/promisfied-fs";
import { DefaultApp } from "../../util/profile";
import { getDistributionGroup, addGroupToRelease } from "./lib/distribute-util";

const debug = require("debug")("appcenter-cli:commands:distribute:release");

@help("Upload release binary and trigger distribution")
export default class ReleaseBinaryCommand extends AppCommand {
  @help("Path to binary file")
  @shortName("f")
  @longName("file")
  @required
  @hasArg
  public filePath: string;

  @help("Build version parameter required for .zip and .msi files")
  @shortName("b")
  @longName("build-version")
  @hasArg
  public buildVersion: string;

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
    const app: DefaultApp = this.app;

    debug("Check that user hasn't selected both --release-notes and --release-notes-file");
    this.validateParameters();

    debug("Loading prerequisites");
    const [distributionGroupUsersCount, releaseBinaryFileBuffer, releaseNotesString] = await out.progress("Loading prerequisites...", this.getPrerequisites(client));

    debug("Creating release upload");
    const createdReleaseUpload = await this.createReleaseUpload(client, app);
    const uploadUri = createdReleaseUpload.uploadUrl;
    const uploadId = createdReleaseUpload.uploadId;

    let releaseUrl: string;
    try {
      debug("Uploading release binary");
      await out.progress("Uploading release binary...", this.uploadFileToUri(uploadUri, releaseBinaryFileBuffer, Path.basename(this.filePath)));

      debug("Finishing release upload");
      releaseUrl = await this.finishReleaseUpload(client, app, uploadId);
    } catch (error) {
      try {
        out.text("Release upload failed");
        await this.abortReleaseUpload(client, app, uploadId);
        out.text("Release upload was aborted");
      } catch (abortError) {
        debug("Failed to abort release upload");
      }

      throw error;
    }

    debug("Extracting release ID from the release URL");
    const releaseId = this.extractReleaseId(releaseUrl);

    debug("Distributing the release");
    await this.distributeRelease(client, app, releaseId, releaseNotesString);

    debug("Retrieving the release");
    const releaseDetails = await this.getDistributeRelease(client, app, releaseId);

    if (releaseDetails) {
      if (_.isNull(distributionGroupUsersCount)) {
        out.text((rd) => `Release ${rd.shortVersion} (${rd.version}) was successfully released to ${this.distributionGroup}`, releaseDetails);
      } else {
        out.text((rd) => `Release ${rd.shortVersion} (${rd.version}) was successfully released to ${distributionGroupUsersCount} testers in ${this.distributionGroup}`, releaseDetails);
      }
    } else {
      out.text(`Release was successfully released.`);
    }
    return success();
  }

  private validateParameters(): void {
    if (!_.isNil(this.releaseNotes) && !_.isNil(this.releaseNotesFile)) {
      throw failure(ErrorCodes.InvalidParameter, "'--release-notes' and '--release-notes-file' switches are mutually exclusive");
    }
    if (_.isNil(this.buildVersion)) {
      const extension = this.filePath.substring(this.filePath.lastIndexOf(".")).toLowerCase();
      if ([".zip", ".msi"].includes(extension)) {
        throw failure(ErrorCodes.InvalidParameter, "--build-version parameter must be specified when uploading .zip or .msi file");
      }
    }
  }

  private getPrerequisites(client: AppCenterClient): Promise<[number | null, Buffer, string]> {
    // load release binary file
    const fileBuffer = this.getReleaseFileBuffer();

    // load release notes file or use provided release notes if none was specified
    const releaseNotesString = this.getReleaseNotesString();

    // get number of distribution group users (and check distribution group existence)
    // return null if request has failed because of any reason except non-existing group name.
    const distributionGroupUsersNumber = this.getDistributionGroupUsersNumber(client);

    return Promise.all([distributionGroupUsersNumber, fileBuffer, releaseNotesString]);
  }

  private async getReleaseFileBuffer(): Promise<Buffer> {
    try {
      return await Pfs.readFile(this.filePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw failure(ErrorCodes.InvalidParameter, `binary file '${this.filePath}' doesn't exist`);
      } else {
        throw error;
      }
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

  private async getDistributionGroupUsersNumber(client: AppCenterClient): Promise<number | null> {
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
        debug(`Failed to get users of distribution group ${this.distributionGroup}, returning null - ${inspect(error)}`);
        return null;
      }
    }

    return distributionGroupUsersRequestResponse.result.length;
  }

  private async createReleaseUpload(client: AppCenterClient, app: DefaultApp): Promise<models.ReleaseUploadBeginResponse> {
    let createReleaseUploadRequestResponse: ClientResponse<models.ReleaseUploadBeginResponse>;
    try {
      createReleaseUploadRequestResponse = await out.progress("Creating release upload...",
        clientRequest<models.ReleaseUploadBeginResponse>((cb) => client.releaseUploads.create(app.ownerName, app.appName, { buildVersion: this.buildVersion }, cb)));
    } catch (error) {
      throw failure(ErrorCodes.Exception, `failed to create release upload for ${this.filePath}`);
    }

    return createReleaseUploadRequestResponse.result;
  }

  private uploadFileToUri(uploadUrl: string, fileBuffer: Buffer, filename: string): Promise<void> {
    debug("Uploading the release binary");
    return new Promise<void>((resolve, reject) => {
      Request.post({
        formData: {
          ipa: {
            options: {
              filename,
              contentType: "application/octet-stream"
            },
            value: fileBuffer
          }
        },
        url: uploadUrl
      })
      .on("error", (error) => {
        reject(failure(ErrorCodes.Exception, `release binary uploading failed: ${error.message}`));
      })
      .on("response", (response) => {
        if (response.statusCode < 400) {
          resolve();
        } else {
          reject(failure(ErrorCodes.Exception, `release binary file uploading failed: HTTP ${response.statusCode} ${response.statusMessage}`));
        }
      });
    });
  }

  private async finishReleaseUpload(client: AppCenterClient, app: DefaultApp, uploadId: string): Promise<string> {
    let finishReleaseUploadRequestResponse: ClientResponse<models.ReleaseUploadEndResponse>;
    try {
      finishReleaseUploadRequestResponse = await out.progress("Finishing release upload...",
        clientRequest<models.ReleaseUploadEndResponse>((cb) => client.releaseUploads.complete(uploadId, app.ownerName, app.appName, "committed", cb)));
    } catch (error) {
      throw failure(ErrorCodes.Exception, `failed to finish release upload for ${this.filePath}`);
    }

    return finishReleaseUploadRequestResponse.result.releaseUrl;
  }

  private async abortReleaseUpload(client: AppCenterClient, app: DefaultApp, uploadId: string): Promise<void> {
    let abortReleaseUploadRequestResponse: ClientResponse<models.ReleaseUploadEndResponse>;
    try {
      abortReleaseUploadRequestResponse = await out.progress("Aborting release upload...",
        clientRequest<models.ReleaseUploadEndResponse>((cb) => client.releaseUploads.complete(uploadId, app.ownerName, app.appName, "aborted", cb)));
    } catch (error) {
      throw new Error(`HTTP ${abortReleaseUploadRequestResponse.response.statusCode} - ${abortReleaseUploadRequestResponse.response.statusMessage}`);
    }
  }

  private extractReleaseId(releaseUrl: string): number {
    const releaseId = Number(_(releaseUrl).split("/").last());
    console.assert(Number.isSafeInteger(releaseId) && releaseId > 0, `API returned unexpected release URL: ${releaseUrl}`);
    return releaseId;
  }

  private async getDistributeRelease(client: AppCenterClient, app: DefaultApp, releaseId: number): Promise<models.ReleaseDetailsResponse> {
    let releaseRequestResponse: ClientResponse<models.ReleaseDetailsResponse>;
    try {
      releaseRequestResponse = await out.progress(`Retrieving the release...`,
        clientRequest<models.ReleaseDetailsResponse>(async (cb) => client.releases.getLatestByUser(releaseId.toString(),
          app.ownerName, app.appName, cb)));
    } catch (error) {
      if (error === 400) {
        throw failure(ErrorCodes.Exception, "release_id is not an integer or the string latest");
      } else if (error === 404) {
        throw failure(ErrorCodes.Exception, `The release ${releaseId} can't be found`);
      } else {
        return null;
      }
    }

    return releaseRequestResponse.result;
  }

  private async putReleaseDetails(client: AppCenterClient, app: DefaultApp, releaseId: number, releaseNotesString?: string): Promise<models.ReleaseUpdateResponse> {
    try {
      const { result, response } = await out.progress(`Updating release details...`,
        clientRequest<models.ReleaseUpdateResponse>(async (cb) => client.releases.updateDetails(releaseId, app.ownerName, app.appName, {
          releaseNotes: releaseNotesString,
        }, cb))
      );

      const statusCode = response.statusCode;
      if (statusCode >= 400) {
        throw statusCode;
      }
      return result;
    } catch (error) {
      if (error === 400) {
        throw failure(ErrorCodes.Exception, "changing distribution group is not supported");
      } else {
        debug(`Failed to distribute the release - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to set distribution group and release notes for release ${releaseId}`);
      }
    }
  }

  private async distributeRelease(client: AppCenterClient, app: DefaultApp, releaseId: number, releaseNotesString: string): Promise<void> {
    await this.putReleaseDetails(client, app, releaseId, releaseNotesString);
    const distributionGroupResponse = await getDistributionGroup({
      client, releaseId, app: this.app, destination: this.distributionGroup, destinationType: "group"
    });
    await addGroupToRelease({
      client, releaseId, distributionGroup: distributionGroupResponse, app: this.app, destination: this.distributionGroup, destinationType: "group", mandatory: false, silent: false
    });
  }
}
