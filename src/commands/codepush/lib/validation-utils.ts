import * as semver from "semver";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { DefaultApp } from "../../../util/profile";

const regexpForMajor = /^\d+$/;
const regexpForMajorMinor = /^\d+\.\d+$/;

// Check if the given string is a semver-compliant version number (e.g. '1.2.3')
// (missing minor/patch values will be added on server side to pass semver.satisfies check)
export function isValidVersion(version: string): boolean {
  return !!semver.valid(version) || regexpForMajorMinor.test(version) || regexpForMajor.test(version);
}

// Allow plain integer versions (as well as '1.0' values) for now, e.g. '1' is valid here and we assume that it is equal to '1.0.0'.
export function isValidRange(semverRange: string): boolean {
  return !!semver.validRange(semverRange);
}

export function isValidRollout(rollout: number): boolean {
  return (rollout && rollout > 0 && rollout <= 100);
}

export async function isValidDeployment(client: AppCenterClient, app: DefaultApp, deploymentName: string): Promise<boolean> {
  const httpRequest = await clientRequest<models.CodePushRelease>(
    (cb) => client.codePushDeployments.get(deploymentName, app.ownerName, app.appName, cb));

  return httpRequest.response.statusCode === 200 ? Promise.resolve(true) : Promise.resolve(false);
}

export function validateVersion(version: string): string {
  if (regexpForMajorMinor.test(version)) {
    return version + ".X";
  } else if (regexpForMajor.test(version)) {
    return version + ".X.X";
  } else {
    return null;
  }
}
