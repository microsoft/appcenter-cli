import * as fs from "fs";
import * as util from "util";
import * as url from "url";
import * as request from "request";

const statAsync = (util as any).promisify(fs.stat);
const debug = require("debug")("appcenter-cli:commands:codepush:file-upload-service-client");

export interface FileUploadOptions {
  assetId: string;
  uploadDomain: string;
  token: string;
  fileName: string;
  filePath: string;
}

const SetMetaDataUrlTemplate = "/upload/set_metadata/%s";
const UploadChunkUrlTemplate = "/upload/upload_chunk/%s";
const FinishUploadUrlTemplate = "/upload/finished/%s";

export class FileUploadServiceClient {
  public async upload(fileUploadOptions: FileUploadOptions): Promise<void> {
    await this.setMetaData(fileUploadOptions);
    await this.uploadChunks(fileUploadOptions);
    await this.finishUpload(fileUploadOptions);
  }

  private async setMetaData(fileUploadOptions: FileUploadOptions): Promise<void> {
    debug(`Starting to set metadata with options: ${util.inspect(fileUploadOptions)}`);

    const metadataPath = util.format(SetMetaDataUrlTemplate, fileUploadOptions.assetId);
    const metaDataUrl = new url.URL(fileUploadOptions.uploadDomain, metadataPath);
    const fileSize = await statAsync(fileUploadOptions.filePath);

    metaDataUrl.searchParams.append("file_name", fileUploadOptions.fileName);
    metaDataUrl.searchParams.append("file_size", fileSize);
    metaDataUrl.searchParams.append("token", fileUploadOptions.token);

    await this.executeRequest(metaDataUrl);
  }

  private async uploadChunks(fileUploadOptions: FileUploadOptions): Promise<void> {
    debug(`Starting to upload chunks with options: ${util.inspect(fileUploadOptions)}`);


    /*

    - Get number of chunks
    - Iterate over chunks
      - Generate chunk URL
      - Get chunk contents
      - POST chunk contents to URL
      */

    throw new Error("Method not implemented.");
  }

  private async finishUpload(fileUploadOptions: FileUploadOptions): Promise<void> {
    debug(`Starting to finish upload with options: ${util.inspect(fileUploadOptions)}`);

    const finishUploadPath = util.format(FinishUploadUrlTemplate, fileUploadOptions.assetId);
    const finishUploadUrl = new url.URL(fileUploadOptions.uploadDomain, finishUploadPath);

    finishUploadUrl.searchParams.append("token", fileUploadOptions.token);

    await this.executeRequest(finishUploadUrl);
  }

  private executeRequest(url: url.URL): Promise<any> {
    debug(`Sending HTTP request to URL: ${url}`);

    return new Promise((resolve, reject) => {
      request.post(url.toString(), (err: Error, response: request.Response) => {
        if (err) { return reject(err); }

        resolve(response);
      });
    });
  }
}