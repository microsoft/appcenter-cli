import { MobileCenterSdkModule } from "../models/mobilecenter-sdk-module";
import { XcodeIntegrationStepContext } from "./xcode-sdk-integration";
import { SearchProjectPaths } from "./sdk-integration-steps/search-project-paths";
import { AddCocoapodsDependencies } from "./sdk-integration-steps/add-cocoapods-dependencies";
import { SearchAppDelegateFile } from "./sdk-integration-steps/search-app-delegate-file";
import { InsertSdkInAppDelegate } from "./sdk-integration-steps/insert-sdk-in-app-delegate";
import { GetAppSecretFromAppDelegate } from "./sdk-integration-steps/get-app-secret-from-app-delegate";

export async function injectSdkIos(
  projectOrWorkspacePath: string,
  podfilePath: string,
  appSecret: string,
  sdkModules: MobileCenterSdkModule,
  sdkVersion?: string): Promise<void> {

  const context = new XcodeIntegrationStepContext(projectOrWorkspacePath, podfilePath, appSecret, sdkModules, sdkVersion);

  await new SearchProjectPaths().run(context);
  await new AddCocoapodsDependencies().run(context);
  await new SearchAppDelegateFile().run(context);
  await new InsertSdkInAppDelegate().run(context);

  await context.runActions();
}

export async function getAppSecret(rootPath: string) {
  const context = new XcodeIntegrationStepContext(null, null, null, null, null);
  context.rootPath = rootPath;
  await new SearchProjectPaths().run(context);
  if (!context.projectRootDirectory) {
    return null;
  }

  await new SearchAppDelegateFile().run(context);
  if (!context.appDelegateFile) {
    return null;
  }

  await new GetAppSecretFromAppDelegate().run(context);

  return context.appSecret;
}