import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, position, name } from "../../../util/commandline";
import { AppCenterClient, clientRequest } from "../../../util/apis";
import { out, prompt } from "../../../util/interaction";
import { inspect } from "util";

const debug = require("debug")("appcenter-cli:commands:codepush:deployment:clear");

@help("Clear the release history associated with a deployment")
export default class CodePushClearDeploymentCommand extends AppCommand {

  @help("Specifies CodePush deployment name to be cleared")
  @name("deployment-name")
  @position(0)
  @required
  public deploymentName: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    if (!await prompt.confirm(`Do you really want to clear release history for deployment ${this.deploymentName}?`)) {
      out.text(`Clearing release history was cancelled`);
      return success();
    }

    try {
      debug("Clearing release history");
      await out.progress(`Clearing release history for deployment ${this.deploymentName}...`,
        clientRequest((cb) => client.codePushDeploymentReleases.deleteMethod(this.deploymentName, app.ownerName, app.appName, cb)));
    } catch (error) {
      debug(`Failed to clear deployment history - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const deploymentNotFoundErrorMsg = `The deployment ${this.deploymentName} does not exist for the app ${this.identifier}`;
        return failure(ErrorCodes.NotFound, deploymentNotFoundErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, error.response.body);
      }
    }

    out.text(`Successfully cleared the deployment ${this.deploymentName} history for the ${this.identifier} app.`);
    return success();
  }
}
