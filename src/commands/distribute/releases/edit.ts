import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg, position, name } from "../../../util/commandline";
import { AppCenterClient, clientRequest, models } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import { handleHttpError } from "../../../util/apis/create-client";

const debug = require("debug")("appcenter-cli:commands:distribute:releases:delete");

@help("Toggles enabling and disabling the specified release")
export default class EditReleaseCommand extends AppCommand {
  @help("Release ID")
  @shortName("r")
  @longName("release-id")
  @required
  @hasArg
  public releaseId: string;

  @help("Release state: enabled or disabled")
  @name("State")
  @position(0)
  @required
  public state: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    const releaseId = Number(this.releaseId);
    if (!Number.isSafeInteger(releaseId) || releaseId <= 0) {
      return failure(ErrorCodes.InvalidParameter, `${this.releaseId} is not a valid release id`);
    }

    const state = this.state;
    if (state !== "enabled" && state !== "disabled") {
      return failure(ErrorCodes.InvalidParameter, `"${state}" is not a valid release state. Available states are "enabled" or "disabled".`);
    }

    let releaseDetails: models.ReleaseDetailsResponse;
    try {
      debug("Loading release details");
      const httpRequest = await out.progress("Loading release details...", clientRequest<models.ReleaseDetailsResponse>(
        (cb) => client.releases.getLatestByUser(this.releaseId, app.ownerName, app.appName, cb)
      ));
      if (httpRequest.response.statusCode >= 400) {
        return httpRequest.response.statusCode === 404 ? failure(ErrorCodes.InvalidParameter, `release ${this.releaseId} doesn't exist`) : failure(ErrorCodes.Exception, "failed to load release details");
      } else {
        releaseDetails = httpRequest.result;
      }
    } catch (error) {
        handleHttpError(error, false, "failed to load release details");
    }

    try {
      debug(`Updating release state to "${state}"`);
      const httpResponse = await out.progress(`${state === "enabled" ? "Enabling" : "Disabling"} the release...`,
        clientRequest((cb) => client.releases.updateDetails(releaseId, app.ownerName, app.appName, { enabled: state === "enabled" }, cb)));
      if (httpResponse.response.statusCode >= 400) {
        return failure(ErrorCodes.Exception, `failed to ${state === "enabled" ? "enable" : "disable"} the release`);
      }
    } catch (error) {
      debug(`Failed to update the release - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, `failed to ${state === "enabled" ? "enable" : "disable"} the release`);
    }

    out.text(`Release ${releaseDetails.shortVersion} (${releaseDetails.version}) with id: ${this.releaseId} has been ${state}`);
    return success();
  }
}
