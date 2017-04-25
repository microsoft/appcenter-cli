import { SdkIntegrationStepContextBase, SdkIntegrationStepBase } from "../util/sdk-integration";
import { MobileCenterSdkModule } from "../mobilecenter-sdk-module";

export class XcodeIntegrationStepContext extends SdkIntegrationStepContextBase {
  constructor(projectPath: string, sdkVersion: string, appSecret: string, sdkModules: MobileCenterSdkModule) {
    super(projectPath, sdkVersion, appSecret, sdkModules);
  }

  public sdkDirectoryName = "Vendor";

  public projectRootDirectory?: string;
  public appDelegateFile?: string;
  public projectName?: string;
}

export abstract class XcodeSdkIntegrationStep extends SdkIntegrationStepBase<XcodeIntegrationStepContext>{ };