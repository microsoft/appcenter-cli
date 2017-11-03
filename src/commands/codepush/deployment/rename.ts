import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, position, name } from "../../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import * as chalk from "chalk";

const debug = require("debug")("mobile-center-cli:commands:codepush:deployment:rename");

@help("Rename CodePush deployment")
export default class CodePushRenameDeploymentCommand extends AppCommand {
  
  @help("Specifies CodePush deployment name to be renamed")
  @name("current-deployment-name")
  @position(0)
  @required
  public currentDeploymentName: string;

  @help("Specifies new CodePush deployment name")
  @name("new-deployment-name")
  @position(1)
  @required
  public newDeploymentName: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    try {
      debug("Renaming CodePush deployments");
      const httpResponse = await out.progress(`Renaming CodePush deployments...`, 
        clientRequest((cb) => client.codePushDeployments.update(this.currentDeploymentName, app.ownerName, app.appName, this.newDeploymentName, cb)));
    } catch (error) {
      debug(`Failed to rename deployments`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${app.ownerName}/${app.appName} does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold("mobile-center apps list")} to see what apps you have access to.`;
        return failure(ErrorCodes.NotFound, appNotFoundErrorMsg);
      } else if (error.statusCode = 409) {
        const alreadyExistErrorMsg = `The deployment with name ${this.newDeploymentName} already exist.`;
        return failure(ErrorCodes.Exception, alreadyExistErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, error.message);
      }
    }

    out.text(`Successfully renamed the ${this.currentDeploymentName} deployment to ${this.newDeploymentName} for the ${app.ownerName}/${app.appName} app.`);  
    return success();
  }
}