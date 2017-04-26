import { MobileCenterSdkModule } from "../mobilecenter-sdk-module";
import { XcodeIntegrationStepContext } from "./xcode-sdk-integration";
import { SearchProjectPaths } from "./sdk-integration-steps/search-project-paths";

export async function injectSdkiOS(projectPath: string, sdkVersion: string, appSecret: string, sdkModules: MobileCenterSdkModule): Promise<void>  {
  const context = new XcodeIntegrationStepContext(projectPath, sdkVersion, appSecret, sdkModules);
  await new SearchProjectPaths().run(context);
  await context.runActions();
}