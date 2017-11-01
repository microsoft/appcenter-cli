import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, position, name } from "../../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";

const debug = require("debug")("mobile-center-cli:commands:codepush:deployment:rename");

@help("Rename CodePush deployment")
export default class ClearCommand extends AppCommand {

  @help("CodePush deployment name to be renamed")
  @name("ExistingDeploymentName")
  @position(0)
  @required
  public deploymentName: string;

  @help("New CodePush deployment name")
  @name("NewDeploymentName")
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
      const httpResponse = await out.progress(`Renaming CodePush deployments ....`, 
        clientRequest((cb) => client.codePushDeployments.update(this.newDeploymentName, app.ownerName, app.appName, cb)));
        
        if (httpResponse.response.statusCode >= 400) {
          throw httpResponse.response.statusCode;
        }
    } catch (error) {
      debug(`Failed to clear deployment history`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${app.ownerName}/${app.appName} does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold("mobile-center apps list")} to see what apps you have access to.`;
        return failure(ErrorCodes.NotFound, appNotFoundErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, error.message);
      }
    }

    out.text(`Successfully renamed the ${this.deploymentName} deployment to ${this.newDeploymentName} for the ${app.ownerName}/${app.appName} app.`);  
    return success();
  }
}