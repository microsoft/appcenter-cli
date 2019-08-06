import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { DefaultApp } from "../../../util/profile/index";

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

  private uploadBundle(releaseUpload: models.CodePushReleaseUpload, bundleZipPath: string): Promise<void> {
    throw new Error("Not implemented yet.");
  }
}
