import * as path from "path";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { DefaultApp } from "../../../util/profile/index";
import { FileUploadServiceClient } from "../lib/file-upload-service-client";

export default class AppCenterCodePushRelease {
  public async upload(client: AppCenterClient, app: DefaultApp, deploymentName: string, updateContentsZipPath: string): Promise<models.CodePushReleaseUpload> {
    const releaseUpload = (await clientRequest<models.CodePushReleaseUpload>(
      () => client.codePushDeploymentUpload.create(
        deploymentName,
        app.ownerName,
        app.appName
      )
    )).result;

    await this.uploadBundle(releaseUpload, updateContentsZipPath);
    return releaseUpload;
  }
  public async release(client: AppCenterClient, app: DefaultApp, deploymentName: string, uploadedRelease: models.CodePushUploadedRelease): Promise<void> {
      await clientRequest<models.CodePushRelease>(
        (cb) => client.codePushDeploymentReleases.create(
          deploymentName,
          uploadedRelease,
          app.ownerName,
          app.appName,
          cb
        )
      );
  }

  private async uploadBundle(releaseUpload: models.CodePushReleaseUpload, bundleZipFilePath: string): Promise<void> {
    const fileName = path.basename(bundleZipFilePath);
    const fileUploadServiceClient = new FileUploadServiceClient();

    await fileUploadServiceClient.upload({
      uploadDomain: releaseUpload.uploadDomain,
      token: releaseUpload.token,
      fileName: fileName,
      filePath: bundleZipFilePath
    });
  }
}
