import { clientRequest, AppCenterClient, models } from "../../../util/apis";
import { ErrorCodes, failure } from "../../../util/commandline";
import { DefaultApp } from "../../../util/profile";
import { inspect } from "util";
import AzureBlobUploadHelper from "./azure-blob-upload-helper";

// eventually we may want to support UWP here
export enum SymbolType {
  AndroidProGuard = "AndroidProguard",
  Apple = "Apple",
  Breakpad = "Breakpad"
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
      await new AzureBlobUploadHelper(this.debug).upload(uploadUrl, artifactPath);

      // sending 'committed' API request to finish uploading
      await this.executeSymbolsUploadingEndRequest(this.client, this.app, symbolUploadId, "committed");
    } catch (error) {
      // uploading failed, aborting upload request
      await this.abortUploadingRequest(this.client, this.app, symbolUploadId);
      throw error;
    }
  }

  private async executeSymbolsUploadingBeginRequest(client: AppCenterClient, app: DefaultApp, symbolType: models.SymbolUploadBeginRequest): Promise<models.SymbolUploadBeginResponse> {
    this.debug("Executing API request to get uploading URL");
    const uploadingBeginResponse = await clientRequest<models.SymbolUploadBeginResponse>((cb) => client.symbolUploads.create(
      symbolType,
      app.ownerName,
      app.appName,
      cb)).catch((error: any) => {
        this.debug(`Failed to start the symbol uploading - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to start the symbol uploading");
      });

    this.debug("Analyzing upload start request response status code");
    const uploadingBeginStatusCode = uploadingBeginResponse.response.statusCode;
    const uploadingBeginStatusMessage = uploadingBeginResponse.response.statusMessage;
    if (uploadingBeginStatusCode >= 400) {
      throw failure(ErrorCodes.Exception,
        `the symbol upload begin API request was rejected: HTTP ${uploadingBeginStatusCode} - ${uploadingBeginStatusMessage}`);
    }

    return uploadingBeginResponse.result;
  }

  private async executeSymbolsUploadingEndRequest(client: AppCenterClient, app: DefaultApp, symbolUploadId: string, desiredStatus: SymbolsUploadEndRequestStatus): Promise<models.SymbolUpload> {
    this.debug(`Finishing symbols uploading with desired status: ${desiredStatus}`);
    const uploadingEndResponse = await clientRequest<models.SymbolUpload>((cb) => client.symbolUploads.complete(
      symbolUploadId,
      app.ownerName,
      app.appName,
      desiredStatus,
      cb,
    )).catch((error: any) => {
      this.debug(`Failed to finalize the symbol upload - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `failed to finalize the symbol upload with status`);
    });

    this.debug("Analyzing upload end request response status code");
    const uploadingEndStatusCode = uploadingEndResponse.response.statusCode;
    const uploadingEndStatusMessage = uploadingEndResponse.response.statusMessage;
    if (uploadingEndStatusCode >= 400) {
      throw failure(ErrorCodes.Exception,
        `the symbol upload end API request was rejected: HTTP ${uploadingEndStatusCode} - ${uploadingEndStatusMessage}`);
    }

    return uploadingEndResponse.result;
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
