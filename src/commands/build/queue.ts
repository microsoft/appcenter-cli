import {AppCommand, Command, CommandArgs, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success} from "../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../util/apis";
import { out } from "../../util/interaction";
import * as PortalHelper from "../../util/portal/portal-helper";

const debug = require("debug")("mobile-center-cli:commands:build:queue");

@help("Queue a new build")
export default class QueueBuildCommand extends AppCommand {

  @help("Branch to be build")
  @shortName("b")
  @longName("branch")
  @required
  @hasArg
  public branchName: string;

  @help("Enable debug mode")
  @shortName("d")
  @longName("debug-logs")
  public debugLogs: boolean;

  async run(client: MobileCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const app = this.app;

    debug(`Queuing build for branch ${this.branchName}`);
    const queueBuildRequestResponse = await out.progress(`Queueing build for branch ${this.branchName}...`, 
      clientRequest<models.Build>((cb) => client.buildOperations.queueBuild(this.branchName, app.ownerName, app.appName, {
        debug: this.debugLogs
      }, cb)));

    const queueBuildHttpResponseCode = queueBuildRequestResponse.response.statusCode;

    if (queueBuildHttpResponseCode >= 400) {
      return failure(ErrorCodes.Exception, "the Queue Build request was rejected for an unknown reason");
    }

    const buildId = queueBuildRequestResponse.result.id;
    const realBranchName = queueBuildRequestResponse.result.sourceBranch;

    const url = PortalHelper.getPortalBuildLink(portalBaseUrl, app.ownerName, app.appName, realBranchName, buildId.toString());

    out.report([
      ["Build ID", "buildId"],
      ["Build URL", "url"]
    ], {buildId, url});

    return success();
  }
}
