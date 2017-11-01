import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, position, name } from "../../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
import { out, prompt } from "../../../util/interaction";

const debug = require("debug")("mobile-center-cli:commands:codepush:deployment:rm");

@help("Remove CodePush deployment")
export default class RemoveCommand extends AppCommand {

  @help("CodePush deployment name to be removed")
  @name("ExistingDeploymentName")
  @position(0)
  @required
  public deploymentName: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    if (!await prompt.confirm(`Do you really want to delete deployment ${this.deploymentName}?`)) {
      out.text(`Deletion of deployment ${this.deploymentName} was cancelled`);
      return success();
    }

    try {
      debug("Removing CodePush deployment");
      const httpResponse = await out.progress(`Removing CodePush deployment ....`, 
        clientRequest((cb) => client.codePushDeployments.deleteMethod(this.deploymentName, app.ownerName, app.appName, cb)));
        
        if (httpResponse.response.statusCode >= 400) {
          throw httpResponse.response.statusCode;
        }
    } catch (error) {
      debug(`Failed to remove CodePush deployment`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${app.ownerName}/${app.appName} does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold("mobile-center apps list")} to see what apps you have access to.`;
        return failure(ErrorCodes.NotFound, appNotFoundErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, error.message);
      }
    }

    out.text(`Successfully removed the ${this.deploymentName} deployment for the ${app.ownerName}/${app.appName} app.`);  
    return success();
  }
}