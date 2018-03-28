import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, position, name } from "../../../util/commandline";
import { AppCenterClient, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";

const debug = require("debug")("appcenter-cli:commands:codepush:deployment:rename");

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

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    try {
      debug("Renaming CodePush deployments");
      await out.progress(`Renaming CodePush deployments...`,
        clientRequest((cb) => client.codePushDeployments.update(this.currentDeploymentName, app.ownerName, app.appName, this.newDeploymentName, cb)));
    } catch (error) {
      debug(`Failed to rename deployments - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The deployemnt ${this.currentDeploymentName} for app ${this.identifier} does not exist.`;
        return failure(ErrorCodes.NotFound, appNotFoundErrorMsg);
      } else if (error.statusCode = 409) {
        const alreadyExistErrorMsg = `The deployment with name ${this.newDeploymentName} already exist.`;
        return failure(ErrorCodes.Exception, alreadyExistErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, error.response.body);
      }
    }

    out.text(`Successfully renamed the ${this.currentDeploymentName} deployment to ${this.newDeploymentName} for the ${this.identifier} app.`);
    return success();
  }
}
