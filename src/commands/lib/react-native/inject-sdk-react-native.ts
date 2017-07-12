import { MobileCenterSdkModule } from "../models/mobilecenter-sdk-module";
import { IMainActivity } from '../Android/models/main-activity';
import { IBuildGradle } from '../Android/models/build-gradle';
import { ReactNativeIntegrationStepContext } from "./react-native-sdk-integration";
import { NpmInstallDependencies } from "./sdk-integration-steps/npm-install-dependencies";
import { InitPodfile } from "./sdk-integration-steps/init-podfile";
import { SearchProjectPaths } from "../ios/sdk-integration-steps/search-project-paths";
import { AddCocoapodsDependencies } from "../ios/sdk-integration-steps/add-cocoapods-dependencies";
import { SearchAppDelegateFile } from "../ios/sdk-integration-steps/search-app-delegate-file";
import { ReactNativeLink } from "./sdk-integration-steps/react-native-link";
import * as Path from "path";
import * as Process from "child_process";

export async function injectSdkReactNative(
  reactNativeProjectPath: string,
  xcodeProjectOrWorkspacePath: string,
  podfilePath: string,
  appSecretIos: string,
  buildGradle: IBuildGradle,
  mainActivity: IMainActivity,
  appSecretAndroid: string,
  sdkModules: MobileCenterSdkModule,
  sdkVersion: string,
  javaSdkVersion: string,
  objectiveCSwiftSdkVersion: string,
  enableAnalyticsAuto: boolean,
  sendCrashesAuto: boolean): Promise<void> {

  const context = new ReactNativeIntegrationStepContext(
    reactNativeProjectPath,
    xcodeProjectOrWorkspacePath,
    podfilePath,
    appSecretAndroid,
    appSecretIos,
    sdkModules,
    enableAnalyticsAuto,
    sendCrashesAuto,
    sdkVersion,
    javaSdkVersion,
    objectiveCSwiftSdkVersion);

  await new NpmInstallDependencies().run(context);
  await new InitPodfile().run(context);
  await new ReactNativeLink().run(context);
  await context.runActions();
}