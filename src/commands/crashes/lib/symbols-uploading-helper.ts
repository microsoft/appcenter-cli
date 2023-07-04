import { AppCenterClient, models } from "../../../util/apis";
import { ErrorCodes, failure } from "../../../util/commandline";
import { DefaultApp } from "../../../util/profile";
import { inspect } from "util";
import AzureBlobUploadHelper from "./azure-blob-upload-helper";

// eventually we may want to support UWP here
export enum SymbolType {
  AndroidProGuard = "AndroidProguard",
  Apple = "Apple",
  Breakpad = "Breakpad",
  UWP = "UWP",
}

export default class SymbolsUploadingHelper {
  constructor(private client: AppCenterClient, private app: DefaultApp, private debug: Function) {}

  public async uploadSymbolsArtifact(artifactPath: string, symbolType: models.SymbolUploadBeginRequest): Promise<void> {
    // executing API request to get an upload URL
    const uploadingBeginRequestResult = await this.executeSymbolsUploadingBeginRequest(this.client, this.app, symbolType);

    // uploading
    const symbolUploadId = uploadingBeginRequestResult.symbolUploadId;

    try {
      // putting ZIP to the specified URL
      const uploadUrl: string = uploadingBeginRequestResult.uploadUrl;
      await new AzureBlobUploadHelper().upload(uploadUrl, artifactPath);

      // sending 'committed' API request to finish uploading
      await this.executeSymbolsUploadingEndRequest(this.client, this.app, symbolUploadId, "committed");
    } catch (error) {
      // uploading failed, aborting upload request
      await this.abortUploadingRequest(this.client, this.app, symbolUploadId);
      throw error;
    }
  }

  private async executeSymbolsUploadingBeginRequest(
    client: AppCenterClient,
    app: DefaultApp,
    symbolType: models.SymbolUploadBeginRequest
  ): Promise<models.SymbolUploadBeginResponse> {
    this.debug("Executing API request to get uploading URL");
    
    try {
      return await client.symbolUploads.create(app.ownerName, app.appName, symbolType);
    } catch (error) {
      this.debug("Analyzing upload start request response status code");
      const uploadingBeginStatusCode = error.response.statusCode;
      const uploadingBeginStatusMessage = error.response.statusMessage;
      if (uploadingBeginStatusCode >= 400) {
        throw failure(
          ErrorCodes.Exception,
          `the symbol upload begin API request was rejected: HTTP ${uploadingBeginStatusCode} - ${uploadingBeginStatusMessage}`
        );
      } else {
        this.debug(`Failed to start the symbol uploading - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to start the symbol uploading");
      }
    }
  }

  private async executeSymbolsUploadingEndRequest(
    client: AppCenterClient,
    app: DefaultApp,
    symbolUploadId: string,
    desiredStatus: SymbolsUploadEndRequestStatus
  ): Promise<models.SymbolUpload> {
    this.debug(`Finishing symbols uploading with desired status: ${desiredStatus}`);

    try {
      return await client.symbolUploads.complete(symbolUploadId, app.ownerName, app.appName, desiredStatus);
    } catch (error) {
      this.debug("Analyzing upload end request response status code");
      const uploadingEndStatusCode = error.response.statusCode;
      const uploadingEndStatusMessage = error.response.statusMessage;
      if (uploadingEndStatusCode >= 400) {
        throw failure(
          ErrorCodes.Exception,
          `the symbol upload end API request was rejected: HTTP ${uploadingEndStatusCode} - ${uploadingEndStatusMessage}`
        );
      } else {
        this.debug(`Failed to finalize the symbol upload - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to finalize the symbol upload with status`);
      }
    }
  }

  private async abortUploadingRequest(client: AppCenterClient, app: DefaultApp, symbolUploadId: string): Promise<models.SymbolUpload> {
    this.debug("Uploading failed, aborting upload request");
    try {
      return await this.executeSymbolsUploadingEndRequest(client, app, symbolUploadId, "aborted");
    } catch (ex) {
      this.debug("Failed to correctly abort the uploading request");
    }
  }
}

type SymbolsUploadEndRequestStatus = "committed" | "aborted";
