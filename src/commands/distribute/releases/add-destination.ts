import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg } from "../../../util/commandline";
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
    debug(`Distributing destination ${this.destination} of type ${this.destinationType} to release ${releaseId}`);

    try {
      await out.progress(`Adding the destination to the release ...`, this.addDestination(client, releaseId));
    } catch (error) {
      if (error.errorCode !== ErrorCodes.InvalidParameter) {
        debug(`Failed to add destination - ${inspect(error)}`);
      }
      return failure(error.errorCode, error.message);
    }

    return success();
  }

  private async addDestination(client: AppCenterClient, releaseId: number): Promise<void> {
    if (this.destinationType === "group") {
      const distributionGroup = await this.getDistributionGroup(client, releaseId);
      await this.addGroupToRelease(client, distributionGroup, releaseId);
    } else if (this.destinationType === "tester") {
      return;
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
    try {
      const { result } = await clientRequest<models.ReleaseDestinationResponse>(async (cb) => {
        client.releases.addDistributionGroup(releaseId, this.app.ownerName, this.app.appName, distributionGroup.id, {
          mandatoryUpdate: false,
          notifyTesters: false,
        }, cb);
      });

      return result;
    } catch (error) {
      if (error.statusCode === 404) {
        throw new AddDestinationError(`Could not find release ${releaseId}`, ErrorCodes.InvalidParameter);
      } else {
        debug(`Failed to distribute the release - ${inspect(error)}`);
        throw new AddDestinationError(`Could not add ${this.destinationType} ${this.destination} to release ${releaseId}`, ErrorCodes.Exception);
      }
    }
  }
}
