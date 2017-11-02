import * as semver from "semver";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
import { DefaultApp } from "../../../util/profile";

export function isValidVersion(semverRange: string): boolean {
  return !!semver.valid(semverRange) || /^\d+\.\d+$/.test(semverRange) || /^\d+$/.test(semverRange);
}

export function isValidRollout(rollout: number): boolean {
  return /^(100|[1-9][0-9]|[1-9])$/.test(rollout.toString());
}

export async function isValidDeployment(client: MobileCenterClient, app: DefaultApp, deploymentName: string): Promise<boolean> {
  const httpRequest = await clientRequest<models.CodePushRelease>(
    (cb) => client.codePushDeployments.get(deploymentName, app.ownerName, app.appName, cb));

  return httpRequest.response.statusCode === 200 ? Promise.resolve(true) : Promise.resolve(false);
}