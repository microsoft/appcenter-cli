import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, position, name } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { formatDate } from "./lib/date-helper";
import { scriptName } from "../../../util/misc";
import * as chalk from "chalk";

const debug = require("debug")("appcenter-cli:commands:codepush:deployments:history");

@help("Display the release history for a CodePush deployment")
export default class CodePushDeploymentHistoryCommand extends AppCommand {

  @help("Specifies CodePush deployment name to view history")
  @required
  @name("deployment-name")
  @position(0)
  public deploymentName: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;
    let releases: models.CodePushRelease[];
    try {
      const httpRequest = await out.progress("Getting CodePush releases...", clientRequest<models.CodePushRelease[]>(
        (cb) => client.codepush.codePushDeploymentReleases.get(this.deploymentName, app.ownerName, app.appName, cb)));
      releases = httpRequest.result;
      out.table(out.getCommandOutputTableOptions(["Label", "Release Time", "App Version", "Mandatory", "Description"]),
        releases.map((release) =>
          [release.label, formatDate(release.uploadTime), release.targetBinaryRange, release.isMandatory, release.description]));
      return success();
    } catch (error) {
      debug(`Failed to get list of CodePush deployments - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${this.identifier} does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold(`${scriptName} apps list`)} to see what apps you have access to.`;
        return failure(ErrorCodes.NotFound, appNotFoundErrorMsg);
      } else if (error.statusCode === 400) {
        const deploymentNotExistErrorMsg = `The deployment ${chalk.bold(this.deploymentName)} does not exist.`;
        return failure(ErrorCodes.Exception, deploymentNotExistErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, error.response.body);
      }
    }
  }
}
