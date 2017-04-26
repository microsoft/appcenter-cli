import { SdkIntegrationStepContextBase, SdkIntegrationStepBase } from "../util/sdk-integration";
import { MobileCenterSdkModule } from "../mobilecenter-sdk-module";

export class XcodeIntegrationStepContext extends SdkIntegrationStepContextBase {
  constructor(projectOrWorkspacePath: string, podfilePath: string, appSecret: string, sdkModules: MobileCenterSdkModule, sdkVersion?: string) {
    super(appSecret, sdkModules, sdkVersion);
    this.projectOrWorkspacePath = projectOrWorkspacePath;
    this.podfilePath = podfilePath;
  }

  public rootPath: string;
  public sdkDirectoryName = "Vendor";
  public projectOrWorkspacePath: string;
  public podfilePath: string;
  public projectRootDirectory?: string;
  public appDelegateFile?: string;
  public projectName?: string;
}

export abstract class XcodeSdkIntegrationStep extends SdkIntegrationStepBase<XcodeIntegrationStepContext>{ };