import { ReleaseStrategy } from "../release-command-skeleton";
import { AppCenterClient, models, clientRequest } from "../../../../util/apis";
import { DefaultApp } from "../../../../util/profile/index";
import * as fs from "fs";

export default class AppCenterCodePushRelease implements ReleaseStrategy {
  public async release(client: AppCenterClient, app: DefaultApp, deploymentName: string, updateContentsZipPath: string, updateMetadata: 
    { appVersion?: string; 
      description?: string; 
      isDisabled?: boolean; 
      isMandatory?: boolean; 
      rollout?: number; }, token?: string, serverUrl?: string): Promise<void> {
      
      await clientRequest<models.CodePushRelease>(
        (cb) => client.codepush.codePushDeploymentReleases.create(
          app.appName,
          deploymentName,
          app.ownerName,
          updateMetadata.appVersion,
          {
            packageProperty: fs.createReadStream(updateContentsZipPath),
            deploymentName: deploymentName,
            description: updateMetadata.description,
            disabled: updateMetadata.isDisabled, 
            mandatory: updateMetadata.isMandatory, 
            noDuplicateReleaseError: false, //TODO: remove it, not needed to send to server
            rollout: updateMetadata.rollout,
          },
          cb));
  } 
}
