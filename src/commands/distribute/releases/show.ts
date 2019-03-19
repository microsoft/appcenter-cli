import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";

const debug = require("debug")("appcenter-cli:commands:distribute:releases:show");

@help("Shows full details about release")
export default class ShowReleaseDetailsCommand extends AppCommand {
  @help("Release ID")
  @shortName("r")
  @longName("release-id")
  @required
  @hasArg
  public releaseId: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;
    const releaseId = Number(this.releaseId);
    const noDestinations = `The release with id ${releaseId} does not have any release destinations.`;
    if (!Number.isSafeInteger(releaseId) || releaseId <= 0) {
      return failure(ErrorCodes.InvalidParameter, `${this.releaseId} is not a valid release id`);
    }

    let releaseDetails: models.ReleaseDetailsResponse;
    try {
      debug("Loading release details");
      const httpRequest = await out.progress("Loading release details...", clientRequest<models.ReleaseDetailsResponse>(
        (cb) => client.releases.getLatestByUser(this.releaseId, app.ownerName, app.appName, cb)
      ));
      if (httpRequest.response.statusCode >= 400) {
        throw httpRequest.response.statusCode;
      } else {
        releaseDetails = httpRequest.result;
      }
    } catch (error) {
      if (error === 404) {
        return failure(ErrorCodes.InvalidParameter, `release ${this.releaseId} doesn't exist`);
      } else {
        debug(`Failed to load release details - ${inspect(error)}`);
        return failure(ErrorCodes.Exception, "failed to load release details");
      }
    }

    out.report([
      ["ID", "id"],
      ["Status", "status"],
      ["Name", "appName"],
      ["Display Name", "appDisplayName"],
      ["Version", "version"],
      ["Short Version", "shortVersion"],
      ["Enabled", "enabled"],
      ["Release Notes", "releaseNotes"],
      ["Size", "size"],
      ["OS Required", "minOs"],
      releaseDetails.androidMinApiLevel ? ["Android API Required", "androidMinApiLevel"] : ["Provisioning Profile Name", "provisioningProfileName"],
      ["Bundle Identifier", "bundleIdentifier"],
      ["Fingerprint", "fingerprint"],
      ["Uploaded At", "uploadedAt", out.report.asDate],
      ["Download URL", "downloadUrl"],
      ["Install URL", "installUrl"],
      ["Icon URL", "appIconUrl"],
      ["Destinations", "destinations", (destinations: models.Destination[]) => destinations && destinations.length > 0 ? JSON.stringify(destinations, null, 2) : noDestinations]
    ], releaseDetails);

    return success();
  }
}
