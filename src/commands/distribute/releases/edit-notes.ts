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
} from "../../../util/commandline";
import { AppCenterClient, models } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import { handleHttpError } from "../../../util/apis/create-client";
import * as Pfs from "../../../util/misc/promisfied-fs";
import * as _ from "lodash";

const debug = require("debug")("appcenter-cli:commands:distribute:releases:edit-notes");

@help("Update release notes")
export default class EditReleaseCommand extends AppCommand {
  @help("Release ID")
  @shortName("r")
  @longName("release-id")
  @required
  @hasArg
  public releaseId: string;

  @help("Release notes text")
  @shortName("n")
  @longName("release-notes")
  @hasArg
  public releaseNotes: string;

  @help("Path to release notes file")
  @shortName("N")
  @longName("release-notes-file")
  @hasArg
  public releaseNotesFile: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    this.validateParameters();

    const releaseId = Number(this.releaseId);
    if (!Number.isSafeInteger(releaseId) || releaseId <= 0) {
      return failure(ErrorCodes.InvalidParameter, `${this.releaseId} is not a valid release id`);
    }

    let releaseDetails: models.ReleaseDetailsResponse;
    let commandFailure: any;
    try {
      debug("Loading release details");
      releaseDetails = await out.progress(
        "Loading release details...",
        client.releases.getLatestByUser(this.releaseId, app.ownerName, app.appName, {
          onResponse: (response, _flatResponse, _error?) => {
            if (response.status >= 400) {
              commandFailure =
                response.status === 404
                  ? failure(ErrorCodes.InvalidParameter, `release ${this.releaseId} doesn't exist`)
                  : failure(ErrorCodes.Exception, "failed to load release details");
            }
          },
        })
      );
    } catch (error) {
      handleHttpError(error, false, "failed to load release details");
    }

    if (commandFailure) {
      return commandFailure;
    }

    const releaseNotes = await this.getReleaseNotesString();

    try {
      debug(`Updating release notes`);
      await out.progress(
        `Updating release notes`,
        client.releases.updateDetails(releaseId, app.ownerName, app.appName, { releaseNotes: releaseNotes })
      );
    } catch (error) {
      debug(`Failed to update the release - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, `failed to update the release notes`);
    }
    out.text(`Release ${releaseDetails.shortVersion} (${releaseDetails.version}) with id: ${this.releaseId} has been updated`);
    return success();
  }

  private async getReleaseNotesString(): Promise<string> {
    if (!_.isNil(this.releaseNotesFile)) {
      try {
        return await Pfs.readFile(this.releaseNotesFile, "utf8");
      } catch (error) {
        if (error.code === "ENOENT") {
          throw failure(ErrorCodes.InvalidParameter, `release notes file '${this.releaseNotesFile}' doesn't exist`);
        } else {
          throw error;
        }
      }
    } else {
      return this.releaseNotes;
    }
  }

  private validateParameters(): void {
    debug("Checking for invalid parameter combinations");
    if (!_.isNil(this.releaseNotes) && !_.isNil(this.releaseNotesFile)) {
      throw failure(ErrorCodes.InvalidParameter, "'--release-notes' and '--release-notes-file' parameters are mutually exclusive");
    } else if (_.isNil(this.releaseNotes) && _.isNil(this.releaseNotesFile)) {
      throw failure(ErrorCodes.InvalidParameter, "One of '--release-notes' and '--release-notes-file' is required");
    }
  }
}
