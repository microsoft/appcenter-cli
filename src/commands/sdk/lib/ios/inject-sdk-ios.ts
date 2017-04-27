import { MobileCenterSdkModule } from "../models/mobilecenter-sdk-module";
import { XcodeIntegrationStepContext } from "./xcode-sdk-integration";
import { SearchProjectPaths } from "./sdk-integration-steps/search-project-paths";

export async function injectSdkIos(
  projectOrWorkspacePath: string,
  podfilePath: string,
  appSecret: string,
  sdkModules: MobileCenterSdkModule,
  sdkVersion?: string): Promise<void>  {

  const context = new XcodeIntegrationStepContext(projectOrWorkspacePath, podfilePath, appSecret, sdkModules, sdkVersion);
  await new SearchProjectPaths().run(context);
  await context.runActions();
}