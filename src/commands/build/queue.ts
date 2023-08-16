import {
  AppCommand,
  CommandResult,
  ErrorCodes,
  failure,
  hasArg,
  help,
  longName,
  required,
  shortName,
  success,
} from "../../util/commandline";
import { AppCenterClient } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as PortalHelper from "../../util/portal/portal-helper";

const debug = require("debug")("appcenter-cli:commands:build:queue");

@help("Queue a new build")
export default class QueueBuildCommand extends AppCommand {
  @help("Branch to be built")
  @shortName("b")
  @longName("branch")
  @required
  @hasArg
  public branchName: string;

  @help("Enable debug mode")
  @shortName("d")
  @longName("debug-logs")
  public debugLogs: boolean;

  @help("Source control version reference")
  @shortName("s")
  @longName("source-version")
  @hasArg
  public sourceVersion: string;

  async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const app = this.app;

    debug(`Queuing build for branch ${this.branchName}`);

    try {
      const queueBuildRequestResponse = await out.progress(
        `Queueing build for branch ${this.branchName}...`,
        client.builds.create(this.branchName, app.ownerName, app.appName, {
          debug: this.debugLogs,
          sourceVersion: this.sourceVersion,
        })
      );

      const buildId = queueBuildRequestResponse.id;
      const realBranchName = queueBuildRequestResponse.sourceBranch;

      const url = PortalHelper.getPortalBuildLink(portalBaseUrl, app.ownerName, app.appName, realBranchName, buildId.toString());

      out.report(
        [
          ["Build ID", "buildId"],
          ["Build URL", "url"],
        ],
        { buildId, url }
      );
    } catch (error) {
      if (error.statusCode === 400) {
        return failure(ErrorCodes.IllegalCommand, `app ${app.appName} is not configured for building`);
      } else {
        debug(`Request failed - ${inspect(error)}`);
        return failure(ErrorCodes.Exception, "failed to queue build request");
      }
    }

    return success();
  }
}
