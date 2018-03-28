import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, position, name } from "../../../util/commandline";
import { AppCenterClient, clientRequest } from "../../../util/apis";
import { out, prompt } from "../../../util/interaction";
import { inspect } from "util";

const debug = require("debug")("appcenter-cli:commands:codepush:deployment:remove");

@help("Remove CodePush deployment")
export default class CodePushRemoveDeploymentCommand extends AppCommand {

  @help("Specifies CodePush deployment name to be removed")
  @name("deployment-name")
  @position(0)
  @required
  public deploymentName: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    if (!await prompt.confirm(`Do you really want to remove deployment ${this.deploymentName}?`)) {
      out.text(`Removing of deployment ${this.deploymentName} was cancelled`);
      return success();
    }

    try {
      debug("Removing CodePush deployment");
      await out.progress(`Removing CodePush deployment...`,
        clientRequest((cb) => client.codePushDeployments.deleteMethod(this.deploymentName, app.ownerName, app.appName, cb)));
    } catch (error) {
      debug(`Failed to remove CodePush deployment - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `Deployment ${this.deploymentName} for the ${this.identifier} app does not exist.`;
        return failure(ErrorCodes.NotFound, appNotFoundErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, error.response.body);
      }
    }

    out.text(`Successfully removed the ${this.deploymentName} deployment for the ${this.identifier} app.`);
    return success();
  }
}
