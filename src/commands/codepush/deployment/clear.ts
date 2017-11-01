import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, position, name } from "../../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
import { out, prompt } from "../../../util/interaction";

const debug = require("debug")("mobile-center-cli:commands:codepush:deployment:clear");

@help("Clear the release history associated with a deployment")
export default class ClearCommand extends AppCommand {

  @help("CodePush deployment name to be cleared")
  @name("ExistingDeploymentName")
  @position(0)
  @required
  public deploymentName: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    if (!await prompt.confirm(`Do you really want to clear release history?`)) {
      out.text(`Clearing release history was cancelled`);
      return success();
    }

    try {
      debug("Clearing release history");
      const httpResponse = await out.progress(`Clearing release history for deployment ${this.deploymentName} ....`, 
        clientRequest((cb) => client.codePushDeploymentReleases.deleteMethod(this.deploymentName, this.app, cb)));
        
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

    out.text(`Successfully cleared the deployment ${this.deploymentName} history for the ${app.ownerName}/${app.appName} app.`);  
    return success();
  }
}