import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg } from "../../../util/commandline";
import { AppCenterClient, clientRequest, models } from "../../../util/apis";
import { out, prompt } from "../../../util/interaction";
import { inspect } from "util";

const debug = require("debug")("appcenter-cli:commands:distribute:releases:delete");

@help("Deletes the release")
export default class DeleteReleaseCommand extends AppCommand {
  @help("Release ID")
  @shortName("r")
  @longName("release-id")
  @required
  @hasArg
  public releaseId: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    const releaseId = Number(this.releaseId);
    if (!Number.isSafeInteger(releaseId) || releaseId <= 0) {
      return failure(ErrorCodes.InvalidParameter, `${this.releaseId} is not a valid release id`);
    }

    if (!await prompt.confirm(`Do you really want to delete release ${this.releaseId}?`)) {
      out.text(`Deletion of release ${this.releaseId} was cancelled`);
      return success();
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

    try {
      debug("Removing release");
      const httpResponse = await out.progress(`Removing the release...`,
        clientRequest((cb) => client.releases.deleteMethod(releaseId, app.ownerName, app.appName, cb)));
      if (httpResponse.response.statusCode >= 400) {
        throw httpResponse.result;
      }
    } catch (error) {
      if (error.code === "partially_deleted") {
        return failure(ErrorCodes.Exception, `release ${this.releaseId} was removed from all distribution groups, but couldn't be deleted from AppCenter`);
      } else {
        debug(`Failed to remove the release - ${inspect(error)}`);
        return failure(ErrorCodes.Exception, `failed to delete the release`);
      }
    }

    out.text(`Release ${releaseDetails.shortVersion} (${releaseDetails.version}) with id: ${this.releaseId} has been deleted`);

    return success();
  }
}
