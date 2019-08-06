import * as util from "util";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { DefaultApp } from "../../../util/profile/index";
import FileUploadClient, { MessageLevel } from "appcenter-file-upload-client";

const debug = require("debug")("appcenter-cli:commands:codepush:appcenter-release");

export default class AppCenterCodePushRelease {
  constructor(private fileUploadClient?: FileUploadClient) {
    this.fileUploadClient = fileUploadClient ? fileUploadClient : new FileUploadClient();
  }

  public async upload(client: AppCenterClient, app: DefaultApp, deploymentName: string, updateContentsZipPath: string): Promise<models.CodePushReleaseUpload> {
    debug(`Starting release upload on deployment: ${deploymentName} with zip file: ${updateContentsZipPath}`);
    const releaseUpload = (await clientRequest<models.CodePushReleaseUpload>(
      (cb) => client.codePushDeploymentUpload.create(
        deploymentName,
        app.ownerName,
        app.appName,
        cb
      )
    )).result;

    await this.uploadBundle(releaseUpload, updateContentsZipPath);
    return releaseUpload;
  }

  public async release(client: AppCenterClient, app: DefaultApp, deploymentName: string, uploadedRelease: models.CodePushUploadedRelease): Promise<void> {
    debug(`Starting release process on deployment: ${deploymentName} with uploaded release metadata: ${util.inspect(uploadedRelease)}`);
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

  private async uploadBundle(releaseUpload: models.CodePushReleaseUpload, bundleZipPath: string): Promise<void> {
    await this.fileUploadClient.upload({
      assetId: releaseUpload.id,
      assetDomain: releaseUpload.uploadDomain,
      assetToken: releaseUpload.token,
      file: bundleZipPath,
      onMessage: (message: string, level: MessageLevel) => {
        debug(`Upload client message: ${message}`);
      }
    });
  }
}
