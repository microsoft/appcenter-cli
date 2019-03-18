import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { ErrorCodes, failure } from "../../../util/commandline";
import { inspect } from "util";
import { DefaultApp } from "../../../util/profile";

const debug = require("debug")("appcenter-cli:commands:distribute");

export interface GetDistributionGroupOptions {
  client: AppCenterClient;
  app: DefaultApp;
  destination: string;
  destinationType: string;
  releaseId: number;
}

export interface AddGroupToReleaseOptions {
  client: AppCenterClient;
  app: DefaultApp;
  distributionGroup: models.DistributionGroupResponse;
  destination: string;
  destinationType: string;
  releaseId: number;
  mandatory: boolean;
  silent: boolean;
}

export async function getDistributionGroup(options: GetDistributionGroupOptions): Promise<models.DistributionGroupResponse> {
  const { client, app, destination, destinationType, releaseId } = options;

  try {
    const { result } = await clientRequest<models.DistributionGroupResponse>(async (cb) => {
      client.distributionGroups.get(app.ownerName, app.appName, destination, cb);
    });

    return result;
  } catch (error) {
    if (error.statusCode === 404) {
      throw failure(ErrorCodes.InvalidParameter, `Could not find group ${destination}`);
    } else {
      debug(`Failed to distribute the release - ${inspect(error)}`);
      throw failure( ErrorCodes.Exception, `Could not add ${destinationType} ${destination} to release ${releaseId}`);
    }
  }
}

export async function addGroupToRelease(options: AddGroupToReleaseOptions): Promise<models.ReleaseDestinationResponse> {
  const { client, app, distributionGroup, releaseId, mandatory, silent, destination, destinationType } = options;

  const { result, response } = await clientRequest<models.ReleaseDestinationResponse>(async (cb) => {
    client.releases.addDistributionGroup(releaseId, app.ownerName, app.appName, distributionGroup.id, {
      mandatoryUpdate: mandatory,
      notifyTesters: !silent
    }, cb);
  });

  if (response.statusCode >= 200 && response.statusCode < 400) {
    return result;
  } else if (response.statusCode === 404) {
    throw failure(ErrorCodes.InvalidParameter, `Could not find release ${releaseId}`);
  } else {
    debug(`Failed to distribute the release - ${inspect(result)}`);
    throw failure(ErrorCodes.Exception, `Could not add ${destinationType} ${destination} to release ${releaseId}`);
  }
}
