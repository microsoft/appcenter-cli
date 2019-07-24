import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, position, name } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { scriptName } from "../../../util/misc";
import * as _ from "lodash";
import chalk from "chalk";
const debug = require("debug")("appcenter-cli:commands:codepush:deployments:add");

@help("Add a new deployment to an app")
export default class CodePushAddCommand extends AppCommand {

  @help("New CodePush deployment name")
  @required
  @name("new-deployment-name")
  @position(0)
  public newDeploymentName: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;
    let deployment: models.Deployment;
    try {
      const httpRequest = await out.progress("Creating a new CodePush deployment...", clientRequest<models.Deployment>(
        (cb) => client.codePushDeployments.create(app.ownerName, app.appName, this.newDeploymentName, cb)));
      deployment = httpRequest.result;
      out.text(`Deployment ${chalk.bold(deployment.name)} has been created for ${this.identifier} with key ${deployment.key}`);
      return success();
    } catch (error) {
      debug(`Failed to add a new CodePush deployment - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${this.identifier} does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold(`${scriptName} apps list`)} to see what apps you have access to.`;
        return failure(ErrorCodes.NotFound, appNotFoundErrorMsg);
      } else if (error.statusCode === 409) {
        const deploymentExistErrorMsg = `A deployment named ${chalk.bold(this.newDeploymentName)} already exists.`;
        return failure(ErrorCodes.Exception, deploymentExistErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, error.response.body);
      }
    }
  }
}
