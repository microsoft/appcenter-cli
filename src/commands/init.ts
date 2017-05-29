// sdk integrate command

import * as _ from "lodash";
import * as path from "path";

import { Command, CommandArgs, CommandResult, ErrorCodes, defaultValue, failure, getCurrentApp, help, required, success } from "../util/commandline";
import { IAndroidJavaProjectDescription, IIosObjectiveCSwiftProjectDescription, IReactNativeProjectDescription, IProjectDescription } from "./lib/models/project-description";
import { checkAndroidJava, injectAndroidJava } from "./lib/android/operations";
import { getLocalApp, getLocalAppNonInteractive } from "./lib/get-local-app";
import { getProjectDescription, getProjectDescriptionNonInteractive } from "./lib/get-project-description";
import { getRemoteApp, getRemoteAppNonInteractive} from "./lib/get-remote-app";
import { getSdkModules, getSdkModulesNonInteractive } from "./lib/get-sdk-modules";
import { hasArg, longName, shortName } from './../util/commandline/option-decorators';
import { out, prompt } from "../util/interaction";

import { IRemoteApp } from "./lib/models/i-remote-app";
import { MobileCenterClient } from "../util/apis";
import collectBuildGradleInfo from "./lib/android/collect-build-gradle-info";
import collectMainActivityInfo from "./lib/android/collect-main-activity-info";
import { getLatestSdkVersion } from "./lib/get-sdk-versions";
import { injectSdkIos } from "./lib/ios/inject-sdk-ios";
import { injectSdkReactNative } from "./lib/react-native/inject-sdk-react-native";
import { reportProject } from "./lib/format-project";

@help("Integrates Mobile Center SDKs into the project")
export default class IntegrateSDKCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("Specify application for command to act on")
  @shortName("a")
  @longName("app")
  @hasArg
  appName: string;

  @help("Specify react native android application for command to act on")
  @longName("app-android")
  @hasArg
  appNameAndroid: string;

  @help("Specify react native iOS application for command to act on")
  @longName("app-ios")
  @hasArg
  appNameIos: string;

  @help("Specify application for command to act on")
  @shortName("n")
  @longName("create-new")
  createNew: boolean;

  @help("The OS the app will be running on")
  @shortName("o")
  @longName("os")
  @hasArg
  os: string;

  @help("The platform of the app")
  @shortName("p")
  @longName("platform")
  @hasArg
  platform: string;

  @help("App's root directory. If not provided current directory is used.")
  @longName("app-dir")
  @hasArg
  appDir: string;

  @help("Branch name")
  @shortName("b")
  @longName("branch")
  @hasArg
  public branchName: string;

  @help("Enable Analytics module")
  @longName("analytics")
  analytics: boolean;

  @help("Enable Crashes module")
  @longName("crashes")
  crashes: boolean;

  @help("Enable Distribute module")
  @longName("distribute")
  distribute: boolean;

  @help("Enable Push module")
  @longName("push")
  push: boolean;

  @help("Initialize sample app")
  @longName("sample-app")
  sampleApp: boolean;

  @help("Project root path for React-Native app")
  @longName("react-native-project-path")
  @hasArg
  reactNativeProjectPath: string;

  @help("Gradle module name for Android app")
  @longName("android-module")
  @hasArg
  androidModule: string;

  @help("Build variant for Android app")
  @longName("android-build-variant")
  @hasArg
  androidBuildVariant: string;

  @help("Project or workspace path for iOS app")
  @longName("ios-project-path")
  @hasArg
  iosProjectPath: string;

  @help("Podfile path for iOS app")
  @longName("ios-podfile-path")
  @hasArg
  iosPodfilePath: string;

  @help("Enable user tracking automatically")
  @longName("enable-user-tracking-auto")
  enableUserTrackingAuto: boolean;

  @help("Send crashes automatically")
  @longName("send-crashes-auto")
  sendCrashesAuto: boolean;

  @help("Non-interactive mode")
  @longName("non-interactive")
  nonInteractive: boolean;

  async run(client: MobileCenterClient): Promise<CommandResult> {
    let os = normalizeOs(this.os);
    let platform = normalizePlatform(this.platform);
    let appDir = this.appDir || "./";
    if (!path.isAbsolute(appDir)) {
      appDir = path.join(process.cwd(), appDir);
    }

    if (!this.nonInteractive) {
      out.text("This utility will walk you through integrating Mobile Center SDKs");
      out.text("into either existing or sample project.");
      out.text("");
      out.text("During the steps of the process you will be asked to provide");
      out.text("information about local app, remote Mobile Center app,");
      out.text("as well as additional info about the project and integration settings.");
      out.text("");
      out.text("To use existing project you should either be in its folder");
      out.text("or use the --app-dir argument.");
      out.text("");
      out.text("See `mobile-center help init` for comprehensive documentation");
      out.text("on other CLI arguments.");
      out.text("");
      out.text("Press ^C at any time to quit.");
      out.text("");
      out.text("We will use the following directory to work in:");
      out.text(appDir);
      out.text("Let's start!");
    }

    try {
      let localApp = this.nonInteractive ?
        await getLocalAppNonInteractive(appDir, os, platform, this.sampleApp) :
        await getLocalApp(appDir, os, platform, this.sampleApp);
        
      if (localApp) {
        appDir = localApp.dir;
        os = localApp.os;
        platform = localApp.platform;
      }

      const getRemoteAppProjectDescription: (os: string, appName: string) => Promise<IProjectDescription & IRemoteApp> =
        async function (os: string, appName: string) {
          const remoteApp = this.nonInteractive ?
            await getRemoteAppNonInteractive(client, appName, os, platform, this.createNew) :
            await getRemoteApp(client, appName, os, platform, this.createNew, appDir);

          const projectDescription = this.nonInteractive ?
            await getProjectDescriptionNonInteractive(
              client,
              remoteApp, appDir,
              this.branchName,
              this.reactNativeProjectPath,
              this.androidModule,
              this.androidBuildVariant,
              this.iosProjectPath,
              this.iosPodfilePath) :
            await getProjectDescription(
              client,
              appDir,
              remoteApp,
              this.branchName,
              this.reactNativeProjectPath,
              this.androidModule,
              this.androidBuildVariant,
              this.iosProjectPath,
              this.iosPodfilePath);
          this.reactNativeProjectPath = this.reactNativeProjectPath || (projectDescription as IReactNativeProjectDescription).reactNativeProjectPath;
          return _.merge(projectDescription, remoteApp);
        }.bind(this);

      let remoteAppProjectDescription: IProjectDescription & IRemoteApp;
      let remoteAppProjectDescriptionAndroid: IAndroidJavaProjectDescription & IRemoteApp;
      let remoteAppProjectDescriptionIos: IIosObjectiveCSwiftProjectDescription & IRemoteApp;
      if (platform.toLocaleLowerCase() === "react-native") {
        remoteAppProjectDescriptionAndroid = await getRemoteAppProjectDescription("android", this.appNameAndroid) as IAndroidJavaProjectDescription & IRemoteApp;
        remoteAppProjectDescriptionIos = await getRemoteAppProjectDescription("ios", this.appNameIos) as IIosObjectiveCSwiftProjectDescription & IRemoteApp;

        if (!remoteAppProjectDescriptionAndroid && !remoteAppProjectDescriptionIos || !this.reactNativeProjectPath) {
          return failure(ErrorCodes.Exception, "There are no projects to integrate");
        }
      } else {
        remoteAppProjectDescription = await getRemoteAppProjectDescription(os, this.appName);
      }

      if (!this.nonInteractive && !await prompt.confirm("Do you really want to integrate SDK(s) into the project?")) {
        out.text("Mobile Center SDKs integration was cancelled");
        return success();
      }

      let javaLatestSdkVersion, objectiveCSwiftLatestSdkVersion, reactNativeLatestSdkVersion, latestSdkVersion;
      switch (platform.toLowerCase()) {
        case "java": javaLatestSdkVersion = latestSdkVersion = await getLatestSdkVersion("java"); break;
        case "objective-c-swift": objectiveCSwiftLatestSdkVersion = latestSdkVersion = await getLatestSdkVersion("objective-c-swift"); break;
        case "react-native":
          javaLatestSdkVersion = await getLatestSdkVersion("java");
          objectiveCSwiftLatestSdkVersion = await getLatestSdkVersion("objective-c-swift");
          reactNativeLatestSdkVersion = latestSdkVersion = await getLatestSdkVersion("react-native");
          break;
      }

      const sdkModules = this.nonInteractive ?
        await getSdkModulesNonInteractive(platform, this.analytics, this.crashes, this.distribute, this.push) :
        await getSdkModules(platform, this.analytics, this.crashes, this.distribute, this.push);

      reportProject([remoteAppProjectDescription, remoteAppProjectDescriptionAndroid, remoteAppProjectDescriptionIos], sdkModules, latestSdkVersion);

      switch (os && os.toLowerCase()) {
        case "android":
          switch (platform.toLowerCase()) {
            case "java":
              const androidJavaProjectDescription = remoteAppProjectDescription as IAndroidJavaProjectDescription;
              const buildGradle = await collectBuildGradleInfo(path.join(appDir, androidJavaProjectDescription.moduleName, "build.gradle"));
              const mainActivity = await collectMainActivityInfo(buildGradle, androidJavaProjectDescription.buildVariant);

              await out.progress("Integrating SDKs into the project...",
                injectAndroidJava(buildGradle,
                  mainActivity,
                  javaLatestSdkVersion,
                  remoteAppProjectDescription.appSecret,
                  sdkModules));
              break;
          }
          break;

        case "ios":
          const iosObjectiveCSwiftProjectDescription = remoteAppProjectDescription as IIosObjectiveCSwiftProjectDescription;
          await out.progress("Integrating SDKs into the project...",
            injectSdkIos(path.join(appDir, iosObjectiveCSwiftProjectDescription.projectOrWorkspacePath),
              iosObjectiveCSwiftProjectDescription.podfilePath && path.join(appDir, iosObjectiveCSwiftProjectDescription.podfilePath),
              remoteAppProjectDescription.appSecret,
              sdkModules,
              objectiveCSwiftLatestSdkVersion));
          break;

        default:
          switch (platform.toLowerCase()) {
            case "react-native":
              const reactNativeProjectPath = path.join(appDir, this.reactNativeProjectPath);

              const buildGradle = remoteAppProjectDescriptionAndroid && remoteAppProjectDescriptionAndroid.moduleName
                && await collectBuildGradleInfo(path.join(appDir, remoteAppProjectDescriptionAndroid.moduleName, "build.gradle"));
              const mainActivity = remoteAppProjectDescriptionAndroid && remoteAppProjectDescriptionAndroid.buildVariant
                && await collectMainActivityInfo(buildGradle, remoteAppProjectDescriptionAndroid.buildVariant);
              const appSecretAndroid = remoteAppProjectDescriptionAndroid && remoteAppProjectDescriptionAndroid.appSecret;

              const projectOrWorkspacePath = remoteAppProjectDescriptionIos && remoteAppProjectDescriptionIos.projectOrWorkspacePath
                && path.join(appDir, remoteAppProjectDescriptionIos.projectOrWorkspacePath);
              const podfilePath = remoteAppProjectDescriptionIos && remoteAppProjectDescriptionIos.podfilePath
                && path.join(appDir, remoteAppProjectDescriptionIos.podfilePath);
              const appSecretIos = remoteAppProjectDescriptionIos && remoteAppProjectDescriptionIos.appSecret;

              //TODO: 
              //await out.progress("Integrating SDKs into the project...",
              await injectSdkReactNative(
                  reactNativeProjectPath,
                  projectOrWorkspacePath,
                  podfilePath,
                  appSecretAndroid,
                  buildGradle,
                  mainActivity,
                  appSecretIos,
                  sdkModules,
                  reactNativeLatestSdkVersion,
                  javaLatestSdkVersion,
                  objectiveCSwiftLatestSdkVersion,
                  this.enableUserTrackingAuto,
                  this.sendCrashesAuto);
              break;
          }
          break;
      }

      out.text("");
      out.text("Congratulations! We have successfully integrated SDK(s) into the project.");

      if (((os && os.toLowerCase()) === "ios" && platform.toLowerCase() === "objective-c-swift")
        || (platform.toLowerCase() === "react-native" && remoteAppProjectDescriptionIos)) {
        out.text("***NOTE: We have inserted all neccessary dependencies in the Podfile.");
        if (process.platform != 'darwin') {
          out.text("But don't forget to run `pod install` to install your newly defined pod.");
        }
      }

    } catch (err) {
      return err.errorMessage ? err : failure(ErrorCodes.Exception, err);
    }
    return success();
  }
}



function normalizeOs(os: string): string {
  switch (os && os.toLowerCase()) {
    case "android": return "Android";
    case "ios": return "iOS";
    default: return os;
  }
}

function normalizePlatform(platform: string): string {
  switch (platform && platform.toLowerCase()) {
    case "java": return "Java";
    case "objective-c-swift": return "Objective-C-Swift";
    case "react-native": return "React-Native";
    case "xamarin": return "Xamarin";
    default: return platform;
  }
}