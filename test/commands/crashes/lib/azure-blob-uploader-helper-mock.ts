import { ErrorCodes, failure } from "../../../../src/util/commandline";
export default class AzureBlobUploadHelperMock {
  private static uploadedArtifactPath: string = null;
  private static uploadUrl: string = null;

  public static getUploadedArtifactUrlAndPath(): [string, string] {
    const url = AzureBlobUploadHelperMock.uploadUrl;
    const path = AzureBlobUploadHelperMock.uploadedArtifactPath;
    AzureBlobUploadHelperMock.uploadUrl =  AzureBlobUploadHelperMock.uploadedArtifactPath = null;
    return [url, path];
  }

  public static throwOnUpload = false;

  public async upload(uploadUrl: string, artifact: string): Promise<void> {
    if (AzureBlobUploadHelperMock.throwOnUpload) {
      throw failure(ErrorCodes.Exception, "Fake failure");
    } else {
      AzureBlobUploadHelperMock.uploadUrl = uploadUrl;
      AzureBlobUploadHelperMock.uploadedArtifactPath = artifact;
      return Promise.resolve();
    }
  }
}
