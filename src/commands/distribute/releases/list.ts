import { AppCommand, CommandResult, ErrorCodes, failure, help, success } from "../../../util/commandline";
import { AppCenterClient, models } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";

const debug = require("debug")("appcenter-cli:commands:distribute:releases:list");

@help("Shows the list of all releases for the application")
export default class ShowReleasesCommand extends AppCommand {
  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    let releases: models.ReleasesListResponse;
    try {
      releases = await out.progress(
        "Loading list of releases...",
        client.releases.list(
          app.ownerName,
          app.appName,
          {
            publishedOnly: true,
          }
        )
      );
    } catch (error) {
      debug(`Failed to get list of releases for the application - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "failed to get list of releases for the application");
    }

    out.reportNewLineSeparatedArray(
      [
        ["ID", "id"],
        ["Short Version", "shortVersion"],
        ["Version", "version"],
        ["Uploaded At", "uploadedAt", out.report.asDate],
      ],
      releases
    );

    return success();
  }
}
