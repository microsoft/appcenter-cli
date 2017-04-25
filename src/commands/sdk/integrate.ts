// sdk integrate command

import { shortName, longName, hasArg } from './../../util/commandline/option-decorators';
import { Command, CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp, required, defaultValue } from "../../util/commandline";
import { out } from "../../util/interaction";
import { DefaultApp } from "../../util/profile";
import { MobileCenterClient } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:list");
import { inspect } from "util";
import injectSdkAndroid from "./lib/android/inject-sdk-android";
import { MobileCenterSdkModule } from "./lib/mobilecenter-sdk-module";

@help("Integrate Mobile Center SDK into the project")
export default class IntegrateSDKCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("Path to the project file to integrate")
  @shortName("p")
  @longName("project-path")
  @hasArg
  projectPath: string;

  @help("Project type")
  @shortName("t")
  @longName("project-type")
  @required
  @hasArg
  projectType: string;

  @help("App Secret")
  @longName("app-secret")
  @required
  @hasArg
  appSecret: string;

  @help("Mobile Center SDK version")
  @longName("sdk-version")
  @required
  @hasArg
  sdkVersion: string;

  @help("Build variant (for Android projects)")
  @longName("build-variant")
  @defaultValue("release")
  @hasArg
  buildVariant: string;

  @help("Enable Analytics module")
  @shortName("a")
  @longName("analytics")
  analyticsModule: boolean;

  @help("Enable Crashes module")
  @shortName("c")
  @longName("crashes")
  crashesModule: boolean;

  @help("Enable Distribute module")
  @shortName("d")
  @longName("distribute")
  distributeModule: boolean;

  async run(client: MobileCenterClient): Promise<CommandResult> {
    let sdkModules: MobileCenterSdkModule = MobileCenterSdkModule.None;
    if (this.analyticsModule)
      sdkModules |= MobileCenterSdkModule.Analytics;
    if (this.crashesModule)
      sdkModules |= MobileCenterSdkModule.Crashes;
    if (this.distributeModule)
      sdkModules |= MobileCenterSdkModule.Distribute;
    if (!sdkModules)
      return failure(ErrorCodes.InvalidParameter, "Please specify at least one SDK module to integrate");
    
    try {
      switch (this.projectType.toLowerCase()) {
        case "android":
          await injectSdkAndroid(this.projectPath, this.buildVariant, this.sdkVersion, this.appSecret, sdkModules);
          break;

        case "ios":
          throw new Error("Logic is not implemented");

        case "xamarin":
          throw new Error("Logic is not implemented");
      }
    } catch (err) {
      return failure(ErrorCodes.Exception, err);
    }

    return success();
  }
}
