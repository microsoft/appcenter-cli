import {
  AppCommand,
  CommandResult,
  ErrorCodes,
  failure,
  help,
  success,
  shortName,
  longName,
  required,
  hasArg,
  position,
  name,
} from "../../../util/commandline";
import { AppCenterClient, models } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import { handleHttpError } from "../../../util/apis/create-client";

const debug = require("debug")("appcenter-cli:commands:distribute:releases:edit");

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
      return failure(
        ErrorCodes.InvalidParameter,
        `"${state}" is not a valid release state. Available states are "enabled" or "disabled".`
      );
    }

    let releaseDetails: models.ReleaseDetailsResponse;
    let commandFailure: any;
    try {
      debug("Loading release details");
      releaseDetails = await out.progress(
        "Loading release details...",
        client.releases.getLatestByUser(
          this.releaseId,
          app.ownerName,
          app.appName,
          {
            onResponse : (response, _flatResponse, _error?) =>
            {
              if (response.status >= 400) {
                commandFailure = response.status === 404
                  ? failure(ErrorCodes.InvalidParameter, `release ${this.releaseId} doesn't exist`)
                  : failure(ErrorCodes.Exception, "failed to load release details");
              }
            }
          },)
      );
    } catch (error) {
      handleHttpError(error, false, "failed to load release details");
    }

    if (commandFailure)
    {
      return commandFailure;
    }

    try {
      debug(`Updating release state to "${state}"`);
      await out.progress(
        `${state === "enabled" ? "Enabling" : "Disabling"} the release...`,
        client.releases.updateDetails(
          releaseId,
          app.ownerName,
          app.appName,
          {
            enabled: state === "enabled",
            onResponse : (response, _flatResponse, _error?) =>
            {
              if (response.status >= 400) {
                commandFailure = failure(ErrorCodes.Exception, `failed to ${state === "enabled" ? "enable" : "disable"} the release`);
              }
            },
          },
        )
      );
      
    } catch (error) {
      debug(`Failed to update the release - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, `failed to ${state === "enabled" ? "enable" : "disable"} the release`);
    }

    if (commandFailure)
    {
      return commandFailure;
    }

    out.text(`Release ${releaseDetails.shortVersion} (${releaseDetails.version}) with id: ${this.releaseId} has been ${state}`);
    return success();
  }
}
