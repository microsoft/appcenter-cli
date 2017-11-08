import * as path from "path";
import * as semver from "semver";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
import { DefaultApp } from "../../../util/profile";

export function isValidVersion(semverRange: string): boolean {
  return !!semver.valid(semverRange) || /^\d+\.\d+$/.test(semverRange) || /^\d+$/.test(semverRange);
}

export function isValidRollout(rollout: number): boolean {
  return (rollout && rollout > 0 && rollout <= 100);
}

export async function isValidDeployment(client: MobileCenterClient, app: DefaultApp, deploymentName: string): Promise<boolean> {
  const httpRequest = await clientRequest<models.CodePushRelease>(
    (cb) => client.codePushDeployments.get(deploymentName, app.ownerName, app.appName, cb));

  return httpRequest.response.statusCode === 200 ? Promise.resolve(true) : Promise.resolve(false);
}

export function isReactNativeProject(): boolean {
  try {
    var projectPackageJson: any = require(path.join(process.cwd(), "package.json"));
    var projectName: string = projectPackageJson.name;
    if (!projectName) {
      throw new Error("The \"package.json\" file in the CWD does not have the \"name\" field set.");
    }

    return projectPackageJson.dependencies["react-native"] || (projectPackageJson.devDependencies && projectPackageJson.devDependencies["react-native"]);
  } catch (error) {
    throw new Error("Unable to find or read \"package.json\" in the CWD. The \"release-react\" command must be executed in a React Native project folder.");
  }
}
