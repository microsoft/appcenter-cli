import {
  AppCommand,
  CommandResult,
  ErrorCodes,
  failure,
  hasArg,
  help,
  longName,
  required,
  shortName,
  success,
} from "../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import * as Path from "path";
import * as Pfs from "../../util/misc/promisfied-fs";
import { DefaultApp, getUser, Profile } from "../../util/profile";
import { getFileUploadLink, getPatchUploadLink } from "./lib/ac-fus-api";
import { getDistributionGroup, addGroupToRelease, parseDistributionGroups, printGroups } from "./lib/distribute-util";
import { getTokenFromEnvironmentVar } from "../../util/profile/environment-vars";
import {
  ACFile,
  ACFusNodeUploader,
  ACFusMessageLevel,
  ACFusUploader,
  ACFusUploadState,
  IProgress,
  LogProperties,
  IUploadStats,
  IInitializeSettings,
  fetchWithOptions,
} from "appcenter-file-upload-client-node";
import { environments } from "../../util/profile/environments";

const debug = require("debug")("appcenter-cli:commands:distribute:release");

@help("Upload release binary and trigger distribution, at least one of --store or --group must be specified")
export default class ReleaseBinaryCommand extends AppCommand {
  @help("Path to binary file")
  @shortName("f")
  @longName("file")
  @required
  @hasArg
  public filePath: string;

  @help("Build version parameter required for .zip, .msi, .pkg and .dmg files")
  @shortName("b")
  @longName("build-version")
  @hasArg
  public buildVersion: string;

  @help("Build number parameter required for macOS .pkg and .dmg files")
  @shortName("n")
  @longName("build-number")
  @hasArg
  public buildNumber: string;

  @help("Comma-separated distribution group names")
  @shortName("g")
  @longName("group")
  @hasArg
  public distributionGroup: string;

  @help("Store name")
  @shortName("s")
  @longName("store")
  @hasArg
  public storeName: string;

  @help("Release notes text (5000 characters max)")
  @shortName("r")
  @longName("release-notes")
  @hasArg
  public releaseNotes: string;

  @help("Path to release notes file (markdown supported, 5000 characters max)")
  @shortName("R")
  @longName("release-notes-file")
  @hasArg
  public releaseNotesFile: string;

  @help("Do not notify testers of this release")
  @longName("silent")
  public silent: boolean;

  @help("Make the release mandatory for the testers (default is false)")
  @longName("mandatory")
  public mandatory: boolean;

  @help("Timeout for waiting release id (in seconds)")
  @shortName("t")
  @longName("timeout")
  @hasArg
  public timeout: string;

  private acFusUploader?: ACFusUploader;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    this.validateParameters();

    debug("Loading prerequisites");
    const [distributionGroupUsersCount, storeInformation, releaseNotesString] = await out.progress(
      "Loading prerequisites...",
      this.getPrerequisites(client)
    );

    this.validateParametersWithPrerequisites(storeInformation);
    const createdReleaseUpload = await this.createReleaseUpload(client, app);
    const releaseId = await this.uploadFile(createdReleaseUpload, app);
    await this.uploadReleaseNotes(releaseNotesString, client, app, releaseId);
    await this.distributeToGroups(client, app, releaseId);
    await this.distributeToStore(storeInformation, client, app, releaseId);
    await this.checkReleaseOnThePortal(distributionGroupUsersCount, client, app, releaseId);
    return success();
  }

  private async uploadFile(releaseUploadParams: any, app: DefaultApp): Promise<any> {
    const uploadId = releaseUploadParams.id;
    const assetId = releaseUploadParams.package_asset_id;
    const urlEncodedToken = releaseUploadParams.url_encoded_token;
    const uploadDomain = releaseUploadParams.upload_domain;

    try {
      await out.progress("Uploading release binary...", this.uploadFileToUri(assetId, urlEncodedToken, uploadDomain));
      await out.progress("Finishing the upload...", this.patchUpload(app, uploadId));
      return await out.progress("Checking the uploaded file...", this.loadReleaseIdUntilSuccess(app, uploadId));
    } catch (error) {
      out.text("Release upload failed");
      throw failure(ErrorCodes.Exception, error.message);
    }
  }

  private async uploadReleaseNotes(
    releaseNotesString: string,
    client: AppCenterClient,
    app: DefaultApp,
    releaseId: number
  ): Promise<void> {
    if (releaseNotesString && releaseNotesString.length > 0) {
      debug("Setting release notes");
      await this.putReleaseDetails(client, app, releaseId, releaseNotesString);
    } else {
      debug("Skipping empty release notes");
    }
  }

  private async distributeToGroups(client: AppCenterClient, app: DefaultApp, releaseId: number) {
    if (!_.isNil(this.distributionGroup)) {
      debug("Distributing the release to group(s)");
      const groups = parseDistributionGroups(this.distributionGroup);
      for (const group of groups) {
        const distributionGroupResponse = await getDistributionGroup({
          client,
          releaseId,
          app: this.app,
          destination: group,
          destinationType: "group",
        });
        await addGroupToRelease({
          client,
          releaseId,
          distributionGroup: distributionGroupResponse,
          app: this.app,
          destination: group,
          destinationType: "group",
          mandatory: this.mandatory,
          silent: this.silent,
        });
      }
    }
  }

  private async distributeToStore(
    storeInformation: models.ExternalStoreResponse,
    client: AppCenterClient,
    app: DefaultApp,
    releaseId: number
  ) {
    if (!_.isNil(storeInformation)) {
      debug("Distributing the release to a store");
      try {
        await this.publishToStore(client, app, storeInformation, releaseId);
      } catch (error) {
        if (!_.isNil(this.distributionGroup)) {
          out.text(
            `Release was successfully distributed to group(s) '${printGroups(
              this.distributionGroup
            )}' but could not be published to store '${this.storeName}'.`
          );
        }
        throw error;
      }
    }
  }

  private async checkReleaseOnThePortal(
    distributionGroupUsersCount: any,
    client: AppCenterClient,
    app: DefaultApp,
    releaseId: number
  ) {
    debug("Retrieving the release");
    const releaseDetails = await this.getDistributeRelease(client, app, releaseId);

    if (releaseDetails) {
      if (!_.isNil(this.distributionGroup)) {
        const storeComment = !_.isNil(this.storeName) ? ` and to store '${this.storeName}'` : "";
        if (_.isNull(distributionGroupUsersCount)) {
          out.text(
            (rd) =>
              `Release ${rd.shortVersion} (${rd.version}) was successfully released to ${printGroups(
                this.distributionGroup
              )}${storeComment}`,
            releaseDetails
          );
        } else {
          out.text(
            (rd) =>
              `Release ${rd.shortVersion} (${
                rd.version
              }) was successfully released to ${distributionGroupUsersCount} testers in ${printGroups(
                this.distributionGroup
              )}${storeComment}`,
            releaseDetails
          );
        }
      } else {
        out.text(
          (rd) => `Release ${rd.shortVersion} (${rd.version}) was successfully released to store '${this.storeName}'`,
          releaseDetails
        );
      }
    } else {
      out.text(`Release was successfully released.`);
    }
  }

  private validateParameters(): void {
    debug("Checking for invalid parameter combinations");
    if (!_.isNil(this.releaseNotes) && !_.isNil(this.releaseNotesFile)) {
      throw failure(ErrorCodes.InvalidParameter, "'--release-notes' and '--release-notes-file' switches are mutually exclusive");
    }
    if (_.isNil(this.distributionGroup) && _.isNil(this.storeName)) {
      throw failure(ErrorCodes.InvalidParameter, "At least one of '--group' or '--store' must be specified");
    }
    if (!_.isNil(this.storeName)) {
      if (![".aab", ".apk", ".ipa"].includes(this.fileExtension)) {
        throw failure(ErrorCodes.InvalidParameter, `Files of type '${this.fileExtension}' can not be distributed to stores`);
      }
    }
    if (_.isNil(this.buildVersion)) {
      if ([".zip", ".msi"].includes(this.fileExtension)) {
        throw failure(
          ErrorCodes.InvalidParameter,
          `--build-version parameter must be specified when uploading ${this.fileExtension} files`
        );
      }
    }
    if (_.isNil(this.buildNumber) || _.isNil(this.buildVersion)) {
      if ([".pkg", ".dmg"].includes(this.fileExtension)) {
        throw failure(
          ErrorCodes.InvalidParameter,
          `--build-version and --build-number must both be specified when uploading ${this.fileExtension} files`
        );
      }
    }
    if (!_.isNil(this.filePath)) {
      const binary = new ACFile(this.filePath);
      if (!binary || binary.size <= 0) {
        throw failure(ErrorCodes.InvalidParameter, `File '${this.filePath}' does not exist.`);
      }
    }
    if (!_.isNil(this.timeout)) {
      if (!(Number.parseInt(this.timeout, 10) >= 0)) {
        throw failure(ErrorCodes.InvalidParameter, `--timeout must be an unsigned int value`);
      }
    }
  }

  private validateParametersWithPrerequisites(storeInformation: models.ExternalStoreResponse): void {
    debug("Checking for invalid parameter combinations with prerequisites");
    if (storeInformation && storeInformation.type === "apple" && _.isNil(this.releaseNotes) && _.isNil(this.releaseNotesFile)) {
      throw failure(
        ErrorCodes.InvalidParameter,
        "At least one of '--release-notes' or '--release-notes-file' must be specified when publishing to an Apple store."
      );
    }
  }

  private async getPrerequisites(client: AppCenterClient): Promise<[number | null, models.ExternalStoreResponse | null, string]> {
    // load release notes file or use provided release notes if none was specified
    const releaseNotesString = this.getReleaseNotesString();

    let distributionGroupUsersNumber: Promise<number | null>;
    let storeInformation: Promise<models.ExternalStoreResponse | null>;
    if (!_.isNil(this.distributionGroup)) {
      // get number of users in distribution group(s) (and check each distribution group existence)
      // return null if request has failed because of any reason except non-existing group name.
      distributionGroupUsersNumber = this.getDistributionGroupUsersNumber(client);
    }
    if (!_.isNil(this.storeName)) {
      // get distribution store type to check existence and further filtering
      storeInformation = this.getStoreDetails(client);
    }

    return Promise.all([distributionGroupUsersNumber, storeInformation, releaseNotesString]);
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
    let userCount = 0;
    const groups = parseDistributionGroups(this.distributionGroup);
    for (const group of groups) {
      let distributionGroupUsersRequestResponse: ClientResponse<models.DistributionGroupUserGetResponse[]>;
      try {
        distributionGroupUsersRequestResponse = await clientRequest<models.DistributionGroupUserGetResponse[]>((cb) =>
          client.distributionGroups.listUsers(this.app.ownerName, this.app.appName, group, cb)
        );
        const statusCode = distributionGroupUsersRequestResponse.response.statusCode;
        if (statusCode >= 400) {
          throw statusCode;
        }
      } catch (error) {
        if (error === 404) {
          throw failure(ErrorCodes.InvalidParameter, `distribution group ${group} was not found`);
        } else {
          debug(`Failed to get users of distribution group ${group}, returning null - ${inspect(error)}`);
          return null;
        }
      }
      userCount += distributionGroupUsersRequestResponse.result.length;
    }

    return userCount;
  }

  private async getStoreDetails(client: AppCenterClient): Promise<models.ExternalStoreResponse | null> {
    try {
      const storeDetailsResponse = await clientRequest<models.ExternalStoreResponse>((cb) =>
        client.stores.get(this.storeName, this.app.ownerName, this.app.appName, cb)
      );
      const statusCode = storeDetailsResponse.response.statusCode;
      if (statusCode >= 400) {
        throw { statusCode };
      }
      return storeDetailsResponse.result;
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `store '${this.storeName}' was not found`);
      } else {
        debug(`Failed to get store details for '${this.storeName}', returning null - ${inspect(error)}`);
        return null;
      }
    }
  }

  private async createReleaseUpload(client: AppCenterClient, app: DefaultApp): Promise<any> {
    debug("Creating release upload");
    const profile = getUser();
    const endpoint = await this.getEndpoint(profile);
    const accessToken = await this.getToken(profile);
    const url = getFileUploadLink(endpoint, app.ownerName, app.appName);
    const body = JSON.stringify({ build_version: this.buildVersion, build_number: this.buildNumber });
    const response = await fetchWithOptions(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": accessToken,
      },
      body: body,
    });
    const json = await response.json();
    if (!json.package_asset_id || (json.statusCode && json.statusCode !== 200)) {
      throw failure(ErrorCodes.Exception, `Failed to create release upload for ${this.filePath}. Backend response: ${json.message}`);
    }
    return json;
  }

  private uploadFileToUri(assetId: string, urlEncodedToken: string, uploadDomain: string): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      debug("Uploading the release binary");
      const uploadSettings: IInitializeSettings = {
        assetId: assetId,
        urlEncodedToken: urlEncodedToken,
        uploadDomain: uploadDomain,
        tenant: "distribution",
        onProgressChanged: (progress: IProgress) => {
          debug("onProgressChanged: " + progress.percentCompleted);
        },
        onMessage: (message: string, properties: LogProperties, level: ACFusMessageLevel) => {
          debug(`onMessage: ${message} \nMessage properties: ${JSON.stringify(properties)}`);
          if (level === ACFusMessageLevel.Error) {
            this.acFusUploader.cancel();
            reject(new Error(`Uploading file error: ${message}`));
          }
        },
        onStateChanged: (status: ACFusUploadState): void => {
          debug(`onStateChanged: ${status.toString()}`);
        },
        onCompleted: (uploadStats: IUploadStats) => {
          debug("Upload completed, total time: " + uploadStats.totalTimeInSeconds);
          resolve();
        },
      };
      this.acFusUploader = new ACFusNodeUploader(uploadSettings);
      const appFile = new ACFile(this.filePath);
      this.acFusUploader.start(appFile);
    });
  }

  private async patchUpload(app: DefaultApp, uploadId: string): Promise<void> {
    debug("Patching the upload");
    const profile = getUser();
    const endpoint = await this.getEndpoint(profile);
    const accessToken = await this.getToken(profile);
    const url = getPatchUploadLink(endpoint, app.ownerName, app.appName, uploadId);
    const response = await fetchWithOptions(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": accessToken,
      },
      body: '{"upload_status":"uploadFinished"}',
    });
    if (!response.ok) {
      throw failure(ErrorCodes.Exception, `Failed to patch release upload. HTTP Status:${response.status} - ${response.statusText}`);
    }
    const json = await response.json();
    const { upload_status, message } = json;
    if (upload_status !== "uploadFinished") {
      throw failure(ErrorCodes.Exception, `Failed to patch release upload: ${message}`);
    }
  }

  private async loadReleaseIdUntilSuccess(app: DefaultApp, uploadId: string): Promise<any> {
    const t0 = Date.now();
    const t1 = t0 + (_.isNil(this.timeout) ? 0 : Number.parseInt(this.timeout, 10) * 1000);
    return new Promise((resolve, reject) => {
      const check = async () => {
        let response;
        try {
          response = await this.loadReleaseId(app, uploadId);
        } catch (error) {
          reject(new Error(`Loading release id failed with error: ${error.errorMessage}`));
        }
        const releaseId = response.release_distinct_id;
        debug(`Received release id is ${releaseId}`);
        if (response.upload_status === "readyToBePublished" && releaseId) {
          debug(`Loading release id completed, total time: ${(Date.now() - t0) / 1000}`);
          resolve(Number(releaseId));
        } else if (response.upload_status === "error") {
          debug(`Loading release id completed, total time: ${(Date.now() - t0) / 1000}`);
          reject(new Error(`Loading release id failed: ${response.error_details}`));
        } else if (t1 > t0 && Date.now() >= t1) {
          reject(new Error(`Loading release id failed by timeout: ${this.timeout}`));
        } else {
          setTimeout(check, 2000);
        }
      };
      check();
    });
  }

  private async loadReleaseId(app: DefaultApp, uploadId: string): Promise<any> {
    try {
      debug("Loading release id...");
      const profile = getUser();
      const endpoint = await this.getEndpoint(profile);
      const accessToken = await this.getToken(profile);
      const url = getPatchUploadLink(endpoint, app.ownerName, app.appName, uploadId);
      const response = await fetchWithOptions(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": accessToken,
        },
      });
      if (response.status < 200 || response.status >= 300) {
        throw failure(ErrorCodes.Exception, `failed to get release id with HTTP status: ${response.status} - ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw failure(ErrorCodes.Exception, `failed to get release id for upload id: ${uploadId}, error: ${JSON.stringify(error)}`);
    }
  }

  private async getToken(profile: Profile): Promise<string> {
    if (this.token?.length > 0) {
      return this.token;
    } else if (profile) {
      const accessToken = await profile.accessToken;
      if (accessToken?.length > 0) {
        return accessToken;
      }
    }
    return getTokenFromEnvironmentVar();
  }

  private async getEndpoint(profile: Profile): Promise<string> {
    if (this.environmentName || !profile) {
      return environments(this.environmentName).endpoint;
    } else {
      return profile.endpoint;
    }
  }

  private async getDistributeRelease(
    client: AppCenterClient,
    app: DefaultApp,
    releaseId: number
  ): Promise<models.ReleaseDetailsResponse> {
    let releaseRequestResponse: ClientResponse<models.ReleaseDetailsResponse>;
    try {
      releaseRequestResponse = await out.progress(
        `Retrieving the release...`,
        clientRequest<models.ReleaseDetailsResponse>(async (cb) =>
          client.releasesOperations.getLatestByUser(releaseId.toString(), app.ownerName, app.appName, cb)
        )
      );
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

  private async putReleaseDetails(
    client: AppCenterClient,
    app: DefaultApp,
    releaseId: number,
    releaseNotesString?: string
  ): Promise<models.ReleaseUpdateResponse> {
    try {
      const { result, response } = await out.progress(
        `Updating release details...`,
        clientRequest<models.ReleaseUpdateResponse>(async (cb) =>
          client.releasesOperations.updateDetails(
            releaseId,
            app.ownerName,
            app.appName,
            {
              releaseNotes: releaseNotesString,
            },
            cb
          )
        )
      );

      const statusCode = response.statusCode;
      if (statusCode >= 400) {
        debug(`Got error response: ${inspect(response)}`);
        throw result;
      }
      return result;
    } catch (error) {
      debug(`Failed to set the release notes - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, error.message);
    }
  }

  private async publishToStore(
    client: AppCenterClient,
    app: DefaultApp,
    storeInformation: models.ExternalStoreResponse,
    releaseId: number
  ): Promise<void> {
    try {
      const { result, response } = await out.progress(
        `Publishing to store '${storeInformation.name}'...`,
        clientRequest<void>(async (cb) =>
          client.releasesOperations.addStore(releaseId, app.ownerName, app.appName, storeInformation.id, cb)
        )
      );

      const statusCode = response.statusCode;
      if (statusCode >= 400) {
        throw result;
      }
      return result;
    } catch (error) {
      debug(`Failed to distribute the release to store - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, error.message);
    }
  }

  private get fileExtension(): string {
    return Path.parse(this.filePath).ext.toLowerCase();
  }
}
