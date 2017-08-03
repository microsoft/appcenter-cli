import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { DefaultApp } from "../../../util/profile";
import { inspect } from "util";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
const _ = require("lodash");

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
      const httpRequest = await out.progress("Getting codepush deployments ...", clientRequest<models.Deployment[]>(
        (cb) => client.deployments.list(app.ownerName, app.appName, cb)));
      deployments = httpRequest.result;
    } catch (error) {
      debug(`Failed to get list of codepush deployments - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "failed to get list of deployments for the app");
    }
    out.table(out.getCommandOutputTableOptions(["Name", "Key"]), deployments.map((deployment) => [deployment.name, deployment.key]));
    return success();
  }
}