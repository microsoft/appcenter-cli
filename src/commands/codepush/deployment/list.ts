import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { DefaultApp } from "../../../util/profile";
import { inspect } from "util";
import { MobileCenterClient, models, clientRequest, clientCall } from "../../../util/apis";
const _ = require("lodash");
const chalk = require("chalk");

const debug = require("debug")("mobile-center-cli:commands:codepush:deployments:list");

@help("List the deployments associated with an app")
export default class ListCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;
    let deployments: models.Deployment[];
    try {
      const httpRequest = await out.progress("Getting codepush deployments...", clientRequest<models.Deployment[]>(
        (cb) => client.deployments.list(app.ownerName, app.appName, cb)));
      deployments = httpRequest.result;
      out.table(out.getCommandOutputTableOptions(["Name", "Key"]), deployments.map((deployment) => [deployment.name, deployment.key]));
      return success();
    } catch (error) {
      debug(`Failed to get list of codepush deployments - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = "The app name does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command " + chalk.bold("mobile-center apps list") + " to see what apps you have access to.";
        return failure(ErrorCodes.InvalidParameter, appNotFoundErrorMsg);
      } else {        
        return failure(ErrorCodes.Exception, "failed to get list of deployments for the app");
      }
    }
  }
}