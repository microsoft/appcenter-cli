import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import * as _ from "lodash";
import * as chalk from "chalk";
import { scriptName } from "../../../util/misc";

const debug = require("debug")("appcenter-cli:commands:codepush:deployments:list");

@help("List the deployments associated with an app")
export default class CodePushDeploymentListListCommand extends AppCommand {

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;
    let deployments: models.Deployment[];
    try {
      const httpRequest = await out.progress("Getting CodePush deployments...", clientRequest<models.Deployment[]>(
        (cb) => client.codePushDeployments.list(app.ownerName, app.appName, cb)));
      deployments = httpRequest.result;
      out.table(out.getCommandOutputTableOptions(["Name", "Key"]), deployments.map((deployment) => [deployment.name, deployment.key]));
      return success();
    } catch (error) {
      debug(`Failed to get list of Codepush deployments - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${this.identifier} does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold(`${scriptName} apps list`)} to see what apps you have access to.`;
        return failure(ErrorCodes.InvalidParameter, appNotFoundErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, "Failed to get list of deployments for the app");
      }
    }
  }
}
