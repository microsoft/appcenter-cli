import { XcodeIntegrationStepContext } from "../ios/xcode-sdk-integration";
import { MobileCenterSdkModule } from "../models/mobilecenter-sdk-module";
import { SdkIntegrationStepContextBase, SdkIntegrationStepBase } from "../util/sdk-integration";

export class ReactNativeIntegrationStepContext extends SdkIntegrationStepContextBase {
  constructor(
    reactNativeProjectPath: string,
    xcodeProjectOrWorkspacePath: string,
    podfilePath: string,
    appSecretAndroid: string,
    appSecretIos: string,
    sdkModules: MobileCenterSdkModule,
    enableAnalyticsAuto: boolean,
    sendCrashesAutomatically: boolean,
    sdkVersion?: string,
    objectiveCSwiftSdkVersion?: string,
    javaSdkVersion?: string) {

    super(null, sdkModules, sdkVersion);

    this.reactNativeProjectPath = reactNativeProjectPath;
    this.xcodeProjectOrWorkspacePath = xcodeProjectOrWorkspacePath;
    this.podfilePath = podfilePath;
    this.appSecretAndroid = appSecretAndroid;
    this.appSecretIos = appSecretIos;
    this.enableAnalyticsAuto = enableAnalyticsAuto;
    this.sendCrashesAuto = sendCrashesAutomatically;
    this.objectiveCSwiftSdkVersion = objectiveCSwiftSdkVersion;
    this.javaSdkVersion = javaSdkVersion;
  }

  public reactNativeProjectPath: string;
  public xcodeProjectOrWorkspacePath: string;
  public podfilePath: string;
  public appSecretAndroid: string;
  public appSecretIos: string;
  public javaSdkVersion: string;
  public objectiveCSwiftSdkVersion: string;
  public enableAnalyticsAuto: boolean;
  public sendCrashesAuto: boolean;
}