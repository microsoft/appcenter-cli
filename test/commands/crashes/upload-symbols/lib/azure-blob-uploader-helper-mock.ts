import { ErrorCodes, failure } from "../../../../../src/util/commandline";
export default class AzureBlobUploadHelperMock {
  private static uploadedZipPath: string = null;
  private static uploadUrl: string = null;

  public static getUploadedZipUrlAndPath(): [string, string] {
    const url = AzureBlobUploadHelperMock.uploadUrl;
    const path = AzureBlobUploadHelperMock.uploadedZipPath;
    AzureBlobUploadHelperMock.uploadUrl =  AzureBlobUploadHelperMock.uploadedZipPath = null;
    return [url, path];
  }

  public static throwOnUpload = false;

  public async upload(uploadUrl: string, zip: string): Promise<void> {
    if (AzureBlobUploadHelperMock.throwOnUpload) {
      throw failure(ErrorCodes.Exception, "Fake failure");
    } else {
      AzureBlobUploadHelperMock.uploadUrl = uploadUrl;
      AzureBlobUploadHelperMock.uploadedZipPath = zip;
      return Promise.resolve();
    }
  }
}
