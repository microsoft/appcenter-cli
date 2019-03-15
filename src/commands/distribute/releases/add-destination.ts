import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg, defaultValue } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { DefaultApp } from "../../../util/profile";

const debug = require("debug")("appcenter-cli:commands:distribute:releases:add-destination");

const ValidDestinationTypes = ["group", "tester"];

class AddDestinationError extends Error {
  constructor(message: string, public errorCode: ErrorCodes) {
    super(message);
  }
}

@help("Distributes an existing release to an additional destination")
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

  @help("Mandatory")
  @shortName("m")
  @longName("mandatory")
  public mandatory: boolean;

  @help("Silent")
  @shortName("s")
  @longName("silent")
  public silent: boolean;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    const releaseId = Number(this.releaseId);
    if (!Number.isSafeInteger(releaseId) || releaseId <= 0) {
      return failure(ErrorCodes.InvalidParameter, `${this.releaseId} is not a valid release id`);
    }

    if (ValidDestinationTypes.indexOf(this.destinationType) === -1) {
      return failure(ErrorCodes.InvalidParameter, `${this.destinationType} is not a valid destination type. Available types are: ${ValidDestinationTypes.join(", ")}`);
    }
    debug(`Distributing destination ${this.destination} of type ${this.destinationType} to release ${releaseId}`);

    try {
      await this.addDestination(client, releaseId);
    } catch (error) {
      return failure(error.errorCode, error.message);
    }
    out.text(`Distribution of ${this.mandatory ? "mandatory " : ""}release ${this.releaseId} to ${this.destinationType} was successful ${this.silent ? "without" : "with"} notification`);
    return success();
    }

  private async addDestination(client: AppCenterClient, releaseId: number): Promise<void> {
    if (this.destinationType === "group") {
      const distributionGroup = await out.progress(`Fetching distribution group information ...`, this.getDistributionGroup(client, releaseId));
      await out.progress(`Distributing release to group ${this.destination}...`, this.addGroupToRelease(client, distributionGroup, releaseId));
    } else if (this.destinationType === "tester") {
      await out.progress(`Distributing release to tester ${this.destination}...`, this.addTesterToRelease(client, releaseId));
    }
  }

  private async getDistributionGroup(client: AppCenterClient, releaseId: number): Promise<models.DistributionGroupResponse> {
    try {
      const { result } = await clientRequest<models.DistributionGroupResponse>(async (cb) => {
        client.distributionGroups.get(this.app.ownerName, this.app.appName, this.destination, cb);
      });

      return result;
    } catch (error) {
      if (error.statusCode === 404) {
        throw new AddDestinationError(`Could not find group ${this.destination}`, ErrorCodes.InvalidParameter);
      } else {
        debug(`Failed to distribute the release - ${inspect(error)}`);
        throw new AddDestinationError(`Could not add ${this.destinationType} ${this.destination} to release ${releaseId}`, ErrorCodes.Exception);
      }
    }
  }

  private async addGroupToRelease(client: AppCenterClient, distributionGroup: models.DistributionGroupResponse, releaseId: number): Promise<models.ReleaseDestinationResponse> {
    const { result, response } = await clientRequest<models.ReleaseDestinationResponse>(async (cb) => {
      client.releases.addDistributionGroup(releaseId, this.app.ownerName, this.app.appName, distributionGroup.id, {
        mandatoryUpdate: this.mandatory,
        notifyTesters: !this.silent
      }, cb);
    });

    if (response.statusCode >= 200 && response.statusCode < 400) {
      return result;
    } else if (response.statusCode === 404) {
      throw new AddDestinationError(`Could not find release ${releaseId}`, ErrorCodes.InvalidParameter);
    } else {
      debug(`Failed to distribute the release - ${inspect(result)}`);
      throw new AddDestinationError(`Could not add ${this.destinationType} ${this.destination} to release ${releaseId}`, ErrorCodes.Exception);
    }
  }

  private async addTesterToRelease(client: AppCenterClient, releaseId: number) {
    const { result, response } = await clientRequest<models.ReleaseDetailsResponse>(async (cb) => {
      client.releases.addTesters(releaseId, this.app.ownerName, this.app.appName, this.destination, {
        mandatoryUpdate: this.mandatory,
        notifyTesters: !this.silent
      }, cb);
    });

    if (response.statusCode >= 200 && response.statusCode < 400) {
      return result;
    } else if (response.statusCode === 404) {
      throw new AddDestinationError(`Could not find release ${releaseId}`, ErrorCodes.InvalidParameter);
    } else {
      debug(`Failed to distribute the release - ${inspect(result)}`);
      throw new AddDestinationError(`Could not add ${this.destinationType} ${this.destination} to release ${releaseId}`, ErrorCodes.Exception);
    }
  }
}
