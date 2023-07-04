import { AppCenterClient, models } from "../../../util/apis";
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

export interface GetExternalStoreToDistributeReleaseOptions {
  client: AppCenterClient;
  app: DefaultApp;
  storeName: string;
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
    return await client.distributionGroups.get(app.ownerName, app.appName, destination);
  } catch (error) {
    if (error.statusCode === 404) {
      throw failure(ErrorCodes.InvalidParameter, `Could not find group ${destination}`);
    } else {
      debug(`Failed to distribute the release - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `Could not add ${destinationType} ${destination} to release ${releaseId}`);
    }
  }
}

export async function getExternalStoreToDistributeRelease(
  options: GetExternalStoreToDistributeReleaseOptions
): Promise<models.ExternalStoreResponse> {
  const { client, app, storeName, releaseId } = options;
  try {
    return await client.stores.get(storeName, app.ownerName, app.appName);
  } catch (error) {
    if (error.statusCode === 404) {
      throw failure(ErrorCodes.InvalidParameter, `Could not find store ${storeName}`);
    } else {
      debug(`Failed to distribute the release - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `Could not add store ${storeName} to release ${releaseId}`);
    }
  }
}

export async function addGroupToRelease(options: AddGroupToReleaseOptions): Promise<models.ReleaseDestinationResponse> {
  const { client, app, distributionGroup, releaseId, mandatory, silent, destinationType, destination } = options;

  return await client.releases.addDistributionGroup(
    releaseId,
    app.ownerName,
    app.appName,
    distributionGroup.id,
    {
      mandatoryUpdate: !!mandatory,
      notifyTesters: !silent,

      onResponse : (response, _flatResponse, _error?) => {
        if (response.status >= 200 && response.status < 400) {
          // all good;
        } else if (response.status === 404) {
          throw failure(ErrorCodes.InvalidParameter, `Could not find release ${releaseId}`);
        } else {
          debug(`Failed to distribute the release - ${inspect(response.parsedBody)}`);
          throw failure(ErrorCodes.Exception, `Could not add ${destinationType} ${destination} to release ${releaseId}`);
        }
      }
    }
  );
}

export function parseDistributionGroups(groups: string): string[] {
  return groups.split(",").map((group) => {
    return group.trim();
  });
}

export function printGroups(groups: string): string {
  return groups
    .split(",")
    .map((group) => {
      return group.trim();
    })
    .join(", ");
}
