import * as AzureStorage from "@azure/storage-blob";
import * as Url from "url";

import { inspect } from "util";

export default class AzureBlobUploadHelper {
  constructor() {}

  public async upload(uploadUrl: string, zip: string): Promise<void> {
    const urlObject = Url.parse(uploadUrl);
    const blobService = this.getBlobService(urlObject);
    const [container, blob] = this.getContainerAndBlob(urlObject);

    await this.uploadBlockBlob(blobService, container, blob, zip).catch((reason) =>
      console.debug(`Failed to upload ZIP with symbols - ${inspect(reason)}`)
    );
  }

  private uploadBlockBlob(
    blobServiceClient: AzureStorage.BlobServiceClient,
    container: string,
    blob: string,
    file: string
  ): Promise<AzureStorage.BlobUploadCommonResponse> {
    const containerClient = blobServiceClient.getContainerClient(container);
    const blockBlobClient = containerClient.getBlockBlobClient(blob);

    return blockBlobClient.uploadFile(file, {
      blobHTTPHeaders: {
        blobContentType: "application/zip",
      },
    });
  }

  private getBlobService(urlObject: Url.Url): AzureStorage.BlobServiceClient {
    const blobEndpoint = Url.format({
      protocol: urlObject.protocol,
      host: urlObject.host,
    });

    return new AzureStorage.BlobServiceClient(blobEndpoint + "?" + urlObject.query);
  }

  private getContainerAndBlob(urlObject: Url.Url): [string, string] {
    const splitPathName = urlObject.pathname.split("/");
    return [splitPathName[1], splitPathName[2]];
  }
}
