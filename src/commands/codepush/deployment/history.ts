import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp, shortName, longName, required, hasArg, position, name } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { DefaultApp } from "../../../util/profile";
import { inspect } from "util";
import { MobileCenterClient, models, clientRequest, clientCall } from "../../../util/apis";
import { formatDate } from "./lib/date-helper";
const _ = require("lodash");
const chalk = require("chalk");
const format = require('date-fns/format');

const debug = require("debug")("mobile-center-cli:commands:codepush:deployments:history");

@help("Display the release history for a deployment")
export default class HistoryCommand extends AppCommand {

  @help("CodePush deployment name")
  @required
  @name("ExistingDeploymentName")
  @position(0)
  public deploymentName: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;
    let releases: models.LiveUpdateRelease[];
    try {
      const httpRequest = await out.progress("Getting CodePush releases...", clientRequest<models.LiveUpdateRelease[]>(
        (cb) => client.deploymentReleases.get(this.deploymentName, app.ownerName, app.appName, cb)));
      releases = httpRequest.result;
      out.table(out.getCommandOutputTableOptions(["Label", "Release Time", "App Version", "Mandatory", "Description"]), releases.map((release) => [release.label, formatDate(release.uploadTime), release.targetBinaryRange, release.isMandatory, release.description]));
      return success();
    } catch (error) {
      debug(`Failed to get list of Codepush deployments - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${app.ownerName}/${app.appName} does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold("mobile-center apps list")} to see what apps you have access to.`;
        return failure(ErrorCodes.InvalidParameter, appNotFoundErrorMsg);
      } else if (error.statusCode === 400) {
        const deploymentNotExistErrorMsg = `The deployment ${chalk.bold(this.deploymentName)} did not exist.`;
        return failure(ErrorCodes.Exception, deploymentNotExistErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, "failed to get list of releases for the app");
      }
    }
  }
}