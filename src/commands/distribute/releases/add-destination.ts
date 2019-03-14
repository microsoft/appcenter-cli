import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { DefaultApp } from "../../../util/profile";

const debug = require("debug")("appcenter-cli:commands:distribute:releases:add-destination");

const ValidDestinationTypes = ["group", "tester"];

@help("Adds a new destination to an existing release")
export default class AddDestinationCommand extends AppCommand {

  @help("Release ID")
  @shortName("r")
  @longName("release-id")
  @required
  @hasArg
  public releaseId: string;

  @help("Destination Type: group or tester")
  @shortName("t")
  @longName("type")
  @required
  @hasArg
  public destinationType: string;

  @help("Destination: The name of the group or the email of a tester")
  @shortName("d")
  @longName("destination")
  @required
  @hasArg
  public destination: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    const releaseId = Number(this.releaseId);
    if (!Number.isSafeInteger(releaseId) || releaseId <= 0) {
      return failure(ErrorCodes.InvalidParameter, `${this.releaseId} is not a valid release id`);
    }

    if (ValidDestinationTypes.indexOf(this.destinationType) === -1) {
      return failure(ErrorCodes.InvalidParameter, `${this.destinationType} is not a valid destination type. Available types are: ${ValidDestinationTypes.join(", ")}`);
    }
    debug("Distributing the release");
    if (this.destinationType == "group") {
      await this.reDistributeGroup(client, app, releaseId, );



    } else if (this.destinationType == "tester") {

    }

    // TODO: Actually call client to add destination ; this is blocked on https://msmobilecenter.visualstudio.com/Mobile-Center/_git/appcenter/pullrequest/24972

    return success();
  }

  private async reDistributeGroup(client: AppCenterClient, app: DefaultApp, releaseId: number, mandatoryUpdate: boolean = false, notifyTesters: boolean= true): Promise<models.ReleaseDetailsResponse> {
    let updateReleaseRequestResponse: ClientResponse<models.ReleaseDetailsResponse>;
    try {
      updateReleaseRequestResponse = await out.progress(`Distributing the release...`,
        clientRequest<models.ReleaseDetailsResponse>(async (cb) => client.releases.addDistributionGroup(releaseId, app.ownerName, app.appName, "groupId", {
          mandatoryUpdate: false,
          notifyTesters: false,
        }, cb)));
      const statusCode = updateReleaseRequestResponse.response.statusCode;
      if (statusCode >= 400) {
        throw statusCode;
      }
    } catch (error) {
      if (error === 400) {
        throw failure(ErrorCodes.Exception, "errorr message");
      } else {
        debug(`Failed to distribute the release - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to set distribution group and release notes for release ${releaseId}`);
      }
    }

    return updateReleaseRequestResponse.result;
  }
}
