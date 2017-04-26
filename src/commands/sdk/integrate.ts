// sdk integrate command

import { shortName, longName, hasArg } from './../../util/commandline/option-decorators';
import { CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp, required, defaultValue, AppCommand } from "../../util/commandline";
import { out, prompt } from "../../util/interaction";
import { DefaultApp } from "../../util/profile";
import { MobileCenterClient, clientRequest, models, ClientResponse } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:list");
import { inspect } from "util";
import injectSdkAndroid from "./lib/android/inject-sdk-android";
import { injectSdkiOS } from "./lib/ios/inject-sdk-ios";
import { MobileCenterSdkModule } from "./lib/mobilecenter-sdk-module";
import { reportProject } from "./lib/format-project";
import { getProjectDescription } from "./lib/project-description";
import * as _ from "lodash";

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

    let branchName = this.branchName;
    
    // Obtain branch name if it's single
    if (!branchName) {
      let branchesStatusesRequestResponse: ClientResponse<models.BranchStatus[]>;
      try {
        branchesStatusesRequestResponse = await out.progress(`Getting statuses for branches of app ${app.appName}...`,
          clientRequest<models.BranchStatus[]>((cb) => client.builds.listBranches(app.ownerName, app.appName, cb)));
      } catch (error) {
        debug(`Request failed - ${inspect(error)}`);
        return failure(ErrorCodes.Exception, "failed to fetch branches list");
      }

      const branchBuildsHttpResponseCode = branchesStatusesRequestResponse.response.statusCode;

      if (branchBuildsHttpResponseCode >= 400) {
        debug(`Request failed - HTTP ${branchBuildsHttpResponseCode} ${branchesStatusesRequestResponse.response.statusMessage}`);
        return failure(ErrorCodes.Exception, "failed to fetch branches list");
      }

      const branchesWithBuilds = _(branchesStatusesRequestResponse.result)
        .filter((branch) => !_.isNil(branch.lastBuild))
        .sortBy((b) => b.lastBuild.sourceBranch)
        .value();

      if (branchesWithBuilds.length === 0) {
        return failure(ErrorCodes.NotFound, `There are no configured branches for the app ${app.appName}`);
      }

      if (branchesWithBuilds.length > 1) {
        return failure(ErrorCodes.IllegalCommand, 
          `There are several branches for the app ${app.appName}. Please specify one using --branch option.`);
      }

      branchName = branchesWithBuilds[0].lastBuild.sourceBranch;
    }

    const branchResponse = await out.progress("Getting branch configuration ...",
      clientRequest<models.BranchConfiguration>(cb =>
        client.branchConfigurations.get(branchName, appDetails.owner.name, appDetails.name, cb)));

    const branchConfig = branchResponse.result;

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
          /*await out.progress("Integrating SDK into the project...",
            injectSdkiOS(null, projectDescription., this.appSecret, sdkModules));*/
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
