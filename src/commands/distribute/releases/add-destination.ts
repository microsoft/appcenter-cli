import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { getDistributionGroup, getExternalStoreToDistributeRelease, addGroupToRelease } from "../lib/distribute-util";
import { IncomingMessage } from "http";

const debug = require("debug")("appcenter-cli:commands:distribute:releases:add-destination");

const ValidDestinationTypes = ["store", "group", "tester"];

@help("Distribute an existing release to an additional destination")
export default class AddDestinationCommand extends AppCommand {

  @help("The ID of the release")
  @shortName("r")
  @longName("release-id")
  @required
  @hasArg
  public releaseId: number;

  @help("The type of destination: [" + ValidDestinationTypes.join(", ") + "]")
  @shortName("t")
  @longName("type")
  @required
  @hasArg
  public destinationType: string;

  @help("The name of the store or group, or the email of the tester")
  @shortName("d")
  @longName("destination")
  @required
  @hasArg
  public destination: string;

  @help("Whether the release is mandatory for the testers (Not used for stores)")
  @shortName("m")
  @longName("mandatory")
  public mandatory: boolean;

  @help("If set, do not send a notification to the testers (Not used for stores)")
  @shortName("s")
  @longName("silent")
  public silent: boolean;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    this.releaseId = Number(this.releaseId);
    if (!Number.isSafeInteger(this.releaseId) || this.releaseId <= 0) {
      return failure(ErrorCodes.InvalidParameter, `${this.releaseId} is not a valid release id`);
    }

    if (ValidDestinationTypes.indexOf(this.destinationType) === -1) {
      return failure(ErrorCodes.InvalidParameter, `${this.destinationType} is not a valid destination type. Available types are: ${ValidDestinationTypes.join(", ")}`);
    }
    debug(`Distributing release ${this.releaseId} to destination ${this.destination} of type ${this.destinationType} to release ${this.releaseId}`);

    try {
      await this.addDestination(client);
    } catch (error) {
      return error;
    }
    out.text(`Distribution of ${this.mandatory ? "mandatory " : ""}release ${this.releaseId} to ${this.destinationType} was successful ${this.silent ? "without" : "with"} notification`);
    return success();
  }

  private async addDestination(client: AppCenterClient): Promise<void> {
    if (this.destinationType === "store") {
      await out.progress(`Distributing release to store ${this.destination}...`, this.addStoreToRelease(client));
    } else if (this.destinationType === "group") {
      const distributionGroup = await out.progress(`Fetching distribution group information ...`, getDistributionGroup({
        client, releaseId: this.releaseId, app: this.app, destination: this.destination, destinationType: this.destinationType
      }));
      await out.progress(`Distributing release to group ${this.destination}...`, addGroupToRelease({
        client, releaseId: this.releaseId, distributionGroup, app: this.app, destination: this.destination, destinationType: this.destinationType, mandatory: this.mandatory, silent: this.silent
      }));
    } else if (this.destinationType === "tester") {
      await out.progress(`Distributing release to tester ${this.destination}...`, this.addTesterToRelease(client));
    }
  }

  private async addStoreToRelease(client: AppCenterClient): Promise<void> {
    const store = await out.progress("Fetching store information...", getExternalStoreToDistributeRelease({
      client, app: this.app, storeName: this.destination, releaseId: this.releaseId
    }));
    const { result, response } = await clientRequest<any>(async (cb) => {
      client.releases.addStore(this.releaseId, this.app.ownerName, this.app.appName, store.id, cb);
    });

    this.handleAddDestinationResponse(result, response);
  }

  private async addTesterToRelease(client: AppCenterClient) {
    const { result, response } = await clientRequest<models.ReleaseDetailsResponse>(async (cb) => {
      client.releases.addTesters(this.releaseId, this.app.ownerName, this.app.appName, this.destination, {
        mandatoryUpdate: this.mandatory,
        notifyTesters: !this.silent
      }, cb);
    });

    this.handleAddDestinationResponse(result, response);
  }

  private handleAddDestinationResponse(result: any, response: IncomingMessage) {
    if (response.statusCode >= 200 && response.statusCode < 400) {
      return result;
    } else if (response.statusCode === 404) {
      throw failure(ErrorCodes.InvalidParameter, `Could not find release ${this.releaseId}`);
    } else {
      debug(`Failed to distribute the release - ${inspect(result)}`);
      throw failure(ErrorCodes.Exception, `Could not add ${this.destinationType} ${this.destination} to release ${this.releaseId}`);
    }
  }
}
