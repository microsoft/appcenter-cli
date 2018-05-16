import LegacyCodePushServiceClient from "../../lib/legacy-codepush-service-client";
import { ReleaseStrategy } from "../release-command-skeleton";
import { AppCenterClient } from "../../../../util/apis";
import { DefaultApp } from "../../../../util/profile/index";
import { PackageInfo } from "../../lib/legacy-codepush-service-client";

export default class LegacyCodePushRelease implements ReleaseStrategy {
  public async release(client: AppCenterClient, app: DefaultApp, deploymentName: string, updateContentsZipPath: string, updateMetadata:
    { appVersion?: string;
      description?: string;
      isDisabled?: boolean;
      isMandatory?: boolean;
      rollout?: number; }, token?: string, serverUrl?: string): Promise<void> {

      const releaseData: PackageInfo = {
        description: updateMetadata.description,
        isDisabled: updateMetadata.isDisabled,
        isMandatory: updateMetadata.isMandatory,
        rollout: updateMetadata.rollout,
        appVersion: updateMetadata.appVersion
      };

      await new LegacyCodePushServiceClient(token, serverUrl, app)
        .release(deploymentName, updateContentsZipPath, releaseData);
  }
}
