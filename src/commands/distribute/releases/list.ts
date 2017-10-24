import { AppCommand, CommandResult, ErrorCodes, failure, help, success } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";

const debug = require("debug")("appcenter-cli:commands:distribute:releases:list");

@help("Shows the list of all releases for the application")
export default class ShowReleasesCommand extends AppCommand {

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    let releases: models.BasicReleaseDetailsResponse[];
    try {
      const httpRequest = await out.progress("Loading list of releases...", clientRequest<models.BasicReleaseDetailsResponse[]>(
        (cb) => client.releases.list(app.ownerName, app.appName, {
          publishedOnly: true
        }, cb)));
      releases = httpRequest.result;
    } catch (error) {
      debug(`Failed to get list of releases for the application - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "failed to get list of releases for the application");
    }

    out.reportNewLineSeparatedArray([
        ["ID", "id"],
        ["Short Version", "shortVersion"],
        ["Version", "version"],
        ["Uploaded At", "uploadedAt", out.report.asDate]
      ], releases);

    return success();
  }
}
