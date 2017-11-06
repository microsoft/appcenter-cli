import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp, shortName, longName, required, hasArg, position, name } from "../../util/commandline";
import { out } from "../../util/interaction";
import { inspect } from "util";
import { MobileCenterClient, models, clientRequest, clientCall } from "../../util/apis";
import * as chalk from "chalk";
import * as semver from "semver";

const debug = require("debug")("mobile-center-cli:commands:codepush:patch");

@help("Update the metadata for an existing CodePush release")
export default class PatchCommand extends AppCommand {
  
  @help("Specifies one existing deployment name.")
  @required
  @name("existing-deployment-name")
  @position(0)
  public deploymentName: string;

  @help("Specifies label of one existing release to update. (Defaults to the latest release within the specified deployment)")
  @required
  @name("existing-release-label")
  @position(1)
  public releaseLabel: string;

  @help("Specifies whether this release should be considered mandatory. (Putting -m flag means mandatory)")
  @shortName("m")
  public isMandatory: boolean;

  @help("Specifies whether this release should be immediately downloadable. (Putting -x flag means disabled)")
  @shortName("x")
  public isDisabled: boolean;

  @help("Specifies binary app version(s) that specifies this release is targeting for. (The value must be a semver expression such as 1.1.0, ~1.2.3)")
  @shortName("t")
  @longName("target-binary-version")
  @hasArg
  public targetBinaryRange: string;

  @help("Specifies description of the changes made to the app with this release.")
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

  async run(client: MobileCenterClient): Promise<CommandResult> {

    const app = this.app;
    let release: models.CodePushRelease;

    if (this.targetBinaryRange === null && this.isDisabled === null && this.isMandatory === null && this.description === null && this.rollout === null) {
      return failure(ErrorCodes.Exception, "At least one property must be specified to patch a release.");
    }

    if (this.rollout != null) {
      if (!/^(100|[1-9][0-9]|[1-9])$/.test(this.rollout)) {
        return failure(ErrorCodes.Exception, `Rollout value should be integer value between ${chalk.bold('0')} or ${chalk.bold('100')}.`);
      }
    }

    const isValidVersion = (version: string): boolean => !!semver.valid(version) || /^\d+\.\d+$/.test(version) || /^\d+$/.test(version);
    if (this.targetBinaryRange != null && !isValidVersion(this.targetBinaryRange)) {
      return failure(ErrorCodes.Exception, "Invalid binary version(s) for a release.");
    }

    let patch : models.CodePushReleaseModification = {
      targetBinaryRange: this.targetBinaryRange,
      isMandatory: this.isMandatory,
      isDisabled: this.isDisabled,
      description: this.description,
    };

    if (this.rollout != null) {
      patch.rollout = parseInt(this.rollout);
    }
    
    try {
      const httpRequest = await out.progress("Patching CodePush release...", clientRequest<models.CodePushRelease>(
        (cb) => client.deploymentReleases.update(this.deploymentName, this.releaseLabel, patch, app.ownerName, app.appName, cb)));
      release = httpRequest.result;
      if (httpRequest.response.statusCode === 204) {
        out.text(`No update for the ${chalk.bold(this.releaseLabel)} of ${chalk.bold(app.appName)} app's ${chalk.bold(this.deploymentName)} deployment`);
      } else {
        out.text(`Successfully updated the ${chalk.bold(release.label)} of ${chalk.bold(app.appName)} app's ${chalk.bold(this.deploymentName)} deployment`);
      }
      return success();
    } catch (error) {
      debug(`Failed to get list of Codepush deployments - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, error.response.body);
    }
  }
}