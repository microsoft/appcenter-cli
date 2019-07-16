import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, shortName, longName, required, hasArg, position, name } from "../../util/commandline";
import { out } from "../../util/interaction";
import { inspect } from "util";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import chalk from "chalk";
import { isValidRollout, isValidRange } from "./lib/validation-utils";
import { DefaultApp } from "../../util/profile";
import { scriptName } from "../../util/misc";

const debug = require("debug")("appcenter-cli:commands:codepush:patch");

@help("Update the metadata for an existing CodePush release")
export default class PatchCommand extends AppCommand {

  @help("Specifies one existing deployment name.")
  @required
  @name("deployment-name")
  @position(0)
  public deploymentName: string;

  @help("Specifies label of one existing release to update. (Defaults to the latest release within the specified deployment)")
  @longName("existing-release-label")
  @shortName("l")
  @hasArg
  public releaseLabel: string;

  @help("Specifies whether this release should be considered mandatory. (Putting -m flag means mandatory)")
  @shortName("m")
  @longName("mandatory")
  public isMandatory: boolean;

  @help("Specifies whether this release should be immediately downloadable. (Putting -x flag means disabled)")
  @shortName("x")
  @longName("disabled")
  public isDisabled: boolean;

  @help("Specifies binary app version(s) that specifies this release is targeting for. (The value must be a semver expression such as 1.1.0, ~1.2.3)")
  @shortName("t")
  @longName("target-binary-version")
  @hasArg
  public targetBinaryRange: string;

  @help("Specifies description of the changes made to the app with this release")
  @shortName("d")
  @longName("description")
  @hasArg
  public description: string;

  @help("Specifies percentage of users this release should be immediately available to. (The specified number must be an integer between 1 and 100)")
  @shortName("r")
  @longName("rollout")
  @hasArg
  public rollout: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {

    const app = this.app;
    let release: models.CodePushRelease;

    if (this.targetBinaryRange === null && this.isDisabled === null && this.isMandatory === null && this.description === null && this.rollout === null) {
      return failure(ErrorCodes.Exception, "At least one property must be specified to patch a release.");
    }

    const rollout = Number(this.rollout);
    if (this.rollout != null && (!Number.isSafeInteger(rollout) || !isValidRollout(rollout))) {
        return failure(ErrorCodes.Exception, `Rollout value should be integer value between ${chalk.bold("0")} or ${chalk.bold("100")}.`);
    }

    if (this.targetBinaryRange != null && !isValidRange(this.targetBinaryRange)) {
      return failure(ErrorCodes.Exception, "Invalid binary version(s) for a release.");
    }

    const patch : models.CodePushReleaseModification = {
      targetBinaryRange: this.targetBinaryRange,
      isMandatory: this.isMandatory,
      isDisabled: this.isDisabled,
      description: this.description,
    };

    if (this.rollout != null) {
      patch.rollout = rollout;
    }

    if (this.releaseLabel == null || this.releaseLabel === "") {
      debug("Release label is not set, get latest...");
      this.releaseLabel = await this.getLatestReleaseLabel(client, app);
    }

    try {
      const httpRequest = await out.progress("Patching CodePush release...", clientRequest<models.CodePushRelease>(
        (cb) => client.deploymentReleases.update(this.deploymentName, this.releaseLabel, patch, app.ownerName, app.appName, cb)));
      release = httpRequest.result;
      if (httpRequest.response.statusCode === 204) {
        out.text(`No update for the ${chalk.bold(this.releaseLabel)} of ${this.identifier} app's ${chalk.bold(this.deploymentName)} deployment`);
      } else {
        out.text(`Successfully updated the ${chalk.bold(release.label)} of ${this.identifier} app's ${chalk.bold(this.deploymentName)} deployment`);
      }
      return success();
    } catch (error) {
      debug(`Failed to patch Codepush deployment - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, error.response.body);
    }
  }

  private async getLatestReleaseLabel(client: AppCenterClient, app: DefaultApp): Promise<string> {
    let releases: models.CodePushRelease[];
    try {
      const httpRequest = await out.progress("Fetching latest release label...", clientRequest<models.CodePushRelease[]>(
        (cb) => client.codePushDeploymentReleases.get(this.deploymentName, app.ownerName, app.appName, cb)));
        releases = httpRequest.result;
    } catch (error) {
      debug(`Failed to get list of CodePush deployments - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${this.identifier} does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold(`${scriptName} apps list`)} to see what apps you have access to.`;
        throw failure(ErrorCodes.NotFound, appNotFoundErrorMsg);
      } else if (error.statusCode === 400) {
        const deploymentNotExistErrorMsg = `The deployment ${chalk.bold(this.deploymentName)} does not exist.`;
        throw failure(ErrorCodes.Exception, deploymentNotExistErrorMsg);
      } else {
        throw failure(ErrorCodes.Exception, error.response.body);
      }
    }

    if (releases && releases.length > 0) {
      return releases[releases.length - 1].label;
    } else {
      throw failure(ErrorCodes.NotFound, `Failed to find any release to patch for ${this.identifier} app's ${chalk.bold(this.deploymentName)} deployment`);
    }
  }
}
