import { clientRequest, MobileCenterClient, models } from "../../../util/apis";
import { ErrorCodes, failure } from "../../../util/commandline";
import { DefaultApp } from "../../../util/profile";
import { inspect } from "util";

import * as JsZip from "jszip";
import * as Crypto from "crypto";
import * as _ from "lodash";
import * as Request from "request";

export default class SymbolsUploadingHelper {
  constructor(private client: MobileCenterClient, private app: DefaultApp, private debug: Function) {}

  public async uploadSymbolsZip(zip: JsZip): Promise<void> {
    // get buffer for the prepared ZIP
    const zipBuffer: Buffer = await this.getZipBuffer(zip);

    // starting ZIP buffer MD5 hash calculation
    const md5Hash: Promise<string> = this.calculateMd5(zipBuffer);

    // executing API request to get an upload URL
    const uploadingBeginRequestResult = await this.executeSymbolsUploadingBeginRequest(this.client, this.app);

    // uploading
    const symbolUploadId = uploadingBeginRequestResult.symbolUploadId;

    try {
      // doing HTTP PUT for ZIP buffer contents to the upload URL
      const uploadUrl: string = uploadingBeginRequestResult.uploadUrl;
      await this.uploadZipFile(uploadUrl, zipBuffer, await md5Hash);

      // sending 'committed' API request to finish uploading
      const uploadingEndRequestResult: models.SymbolUpload = await this.executeSymbolsUploadingEndRequest(this.client, this.app, symbolUploadId, "committed");
    } catch (error) {
      // uploading failed, aborting upload request
      const uploadingAbortRequestResult = await this.abortUploadingRequest(this.client, this.app, symbolUploadId);
      throw error;
    }
  }

  private async getZipBuffer(zip: JsZip): Promise<Buffer> {
    try {
      this.debug("Getting in-memory ZIP archive as Buffer");
      return await zip.generateAsync({
        type: "nodebuffer"
      });
    } catch (error) {
       throw failure(ErrorCodes.Exception, `Failed to compress the ZIP file: ${_.toString(error)}`);
    }
  }

  private calculateMd5(buffer: Buffer): Promise<string> {
    return new Promise<string>((resolve) => {
      resolve(Crypto.createHash("md5").update(buffer).digest("base64"));
    });
  }

  private async executeSymbolsUploadingBeginRequest(client: MobileCenterClient, app: DefaultApp): Promise<models.SymbolUploadBeginResponse> {
    this.debug("Executing API request to get uploading URL");
    const uploadingBeginResponse = await clientRequest<models.SymbolUploadBeginResponse>((cb) => client.symbols.postSymbolUpload(
      app.ownerName,
      app.appName,
      "Apple",
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

  private uploadZipFile(uploadUrl: string, zippedFileBuffer: Buffer, md5Hash: string): Promise<void> {
    this.debug("Uploading the prepared ZIP file");
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
        reject(failure(ErrorCodes.Exception, `ZIP file uploading failed: ${error.message}`));
      })
      .on("response", (response) => {
        if (response.statusCode < 400) {
          resolve();
        } else {
          reject(failure(ErrorCodes.Exception, `ZIP file uploading failed: HTTP ${response.statusCode}`));
        }
      });
    });
  }

  private async executeSymbolsUploadingEndRequest(client: MobileCenterClient, app: DefaultApp, symbolUploadId: string, desiredStatus: SymbolsUploadEndRequestStatus): Promise<models.SymbolUpload> {
    this.debug(`Finishing symbols uploading with desired status: ${desiredStatus}`);
    const uploadingEndResponse = await clientRequest<models.SymbolUpload>((cb) => client.symbols.patchSymbolUpload(
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

  private async abortUploadingRequest(client: MobileCenterClient, app: DefaultApp, symbolUploadId: string): Promise<models.SymbolUpload> {
    this.debug("Uploading failed, aborting upload request");
    try {
      return await this.executeSymbolsUploadingEndRequest(client, app, symbolUploadId, "aborted");
    } catch (ex) {
      this.debug("Failed to correctly abort the uploading request");
    }
  }
}

type SymbolsUploadEndRequestStatus = "committed" | "aborted";
