import LegacyCodePushServiceClient from "../../lib/legacy-codepush-service-client";
import { ReleaseStrategy } from "../release-command-skeleton";
import { out } from "../../../../util/interaction";
import { AppCenterClient, models, clientRequest } from "../../../../util/apis";
import { DefaultApp } from "../../../../util/profile/index";
import { PackageInfo } from "../../lib/legacy-codepush-service-client";

export default class LegacyCodePushRelease implements ReleaseStrategy {
  public release(client: AppCenterClient, app: DefaultApp, deploymentName: string, updateContentsZipPath: string, updateMetadata: 
    { appVersion?: string; 
      description?: string; 
      isDisabled?: boolean; 
      isMandatory?: boolean; 
      rollout?: number; }, debug: Function, token?: string, serverUrl?: string): Promise<void> {
      var releaseData: PackageInfo = {
        description: updateMetadata.description,
        isDisabled: updateMetadata.isDisabled,
        isMandatory: updateMetadata.isMandatory,
        rollout: updateMetadata.rollout,
        appVersion: updateMetadata.appVersion
      };

      return new LegacyCodePushServiceClient(token, serverUrl, app, debug, null)
        .release(deploymentName, updateContentsZipPath, releaseData);   
  } 
}

      

      
