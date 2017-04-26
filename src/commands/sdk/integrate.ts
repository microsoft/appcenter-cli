// sdk integrate command

import { shortName, longName, hasArg } from './../../util/commandline/option-decorators';
import { CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp, required, defaultValue, AppCommand } from "../../util/commandline";
import { out, prompt } from "../../util/interaction";
import { DefaultApp } from "../../util/profile";
import { MobileCenterClient, clientRequest, models } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:list");
import { inspect } from "util";
import injectSdkAndroid from "./lib/android/inject-sdk-android";
import { MobileCenterSdkModule } from "./lib/mobilecenter-sdk-module";
import { reportProject } from "./lib/format-project";
import { getProjectDescription } from "./lib/project-description";

@help("Integrate Mobile Center SDK into the project")
export default class IntegrateSDKCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("App's root directory. If not provided current directory is used.")
  @longName("app-dir")
  @hasArg
  appDir: string;

  @help("Branch name")
  @shortName("b")
  @longName("branch")
  @required
  @hasArg
  public branchName: string;

  @help("Enable Analytics module")
  @longName("analytics")
  analyticsModule: boolean;

  @help("Enable Crashes module")
  @longName("crashes")
  crashesModule: boolean;

  @help("Enable Distribute module")
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

    const appDir = this.appDir || __dirname;

    const app = this.app;

    const appDetailsResponse = await out.progress("Getting app details ...",
      clientRequest<models.AppResponse>(cb => client.apps.get(app.ownerName, app.appName, cb)));

    const statusCode = appDetailsResponse.response.statusCode;

    if (statusCode >= 400) {
      switch (statusCode) {
        case 400:
          return failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
        case 404:
          return failure(ErrorCodes.NotFound, `the app "${app.identifier}" could not be found`);
        default:
          return failure(ErrorCodes.Exception, "Unknown error when loading apps");
      }
    }

    const appDetails = appDetailsResponse.result;

    const branchResponse = await out.progress("Getting branch configuration ...",
      clientRequest<models.BranchConfiguration>(cb =>
        client.branchConfigurations.get(this.branchName, appDetails.owner.name, appDetails.name, cb)));

    const branchConfig = branchResponse.result;

    const branchName = this.branchName; // TODO: Obtain branch name if it's single

    const projectDescription = getProjectDescription(appDetails, appDir, branchName, branchConfig);

    out.text("Project to integrate SDK:");
    reportProject(projectDescription);

    if (!await prompt.confirm("Do you really want to integrate SDK into the project?")) {
      out.text("Mobile Center SDK integration was cancelled");
      return success();
    }

    try {
      switch (projectDescription.os) {
        case "Android":
          switch (projectDescription.platform) {
            case "Java":
              await out.progress("Integrating SDK into the project...",
                injectSdkAndroid(projectDescription.androidJava.modulePath,
                  projectDescription.androidJava.buildVariant, "0.6.1", // TODO: Retrieve SDK version from somewhere
                  projectDescription.appSecret, sdkModules));
              break;
          }
          break;

        case "iOS":
          break;

        default:
          break;
      }
    } catch (err) {
      return failure(ErrorCodes.Exception, err);
    }

    out.text("Success.");
    return success();
  }
}
