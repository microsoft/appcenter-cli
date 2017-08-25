import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp, shortName, longName, required, hasArg, position, name } from "../../util/commandline";
import { out } from "../../util/interaction";
import { inspect } from "util";
import { MobileCenterClient, models, clientRequest, clientCall } from "../../util/apis";
import * as _ from "lodash";
import * as chalk from "chalk";
import * as semver from "semver";

const debug = require("debug")("mobile-center-cli:commands:codepush:patch");

@help("Update the metadata for an existing release")
export default class PatchCommand extends AppCommand {
  
  @help("CodePush deployment name.")
  @required
  @name("ExistingDeploymentName")
  @position(0)
  public deploymentName: string;

  @help("Label of the release to update. Defaults to the latest release within the specified deployment.")
  @required
  @name("ExistingReleaseLabel")
  @position(1)
  public releaseLabel: string;

  @help("Specifies whether this release should be considered mandatory. Putting -m flag means mandatory.")
  @shortName("m")
  public isMandatory: boolean;

  @help("Specifies whether this release should be immediately downloadable. Putting -x flag means disabled.")
  @shortName("x")
  public isDisabled: boolean;

  @help("Semver expression that specifies the binary app version(s) this release is targeting (e.g. 1.1.0, ~1.2.3).")
  @shortName("t")
  @longName("targetBinaryVersion")
  @hasArg
  public targetBinaryRange: string;

  @help("Description of the changes made to the app with this release.")
  @shortName("d")
  @longName("description")
  @hasArg
  public description: string;

  @help("Percentage of users this release should be immediately available to. This attribute can only be increased from the current value.")
  @shortName("r")
  @longName("rollout")
  @hasArg
  public rollout: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {

    const app = this.app;
    let release: models.LiveUpdateRelease;

    if (this.targetBinaryRange === null && this.isDisabled === null && this.isMandatory === null && this.description === null && this.rollout === null) {
      return failure(ErrorCodes.Exception, "At least one property must be specified to patch a release.");
    }

    if (this.rollout != null && this.rollout !== undefined) {
      if (parseInt(this.rollout) < 0 || parseInt(this.rollout) > 100 || !/^(100|[1-9][0-9]|[1-9])$/.test(this.rollout)) {
        return failure(ErrorCodes.Exception, `Rollout value should be integer value between ${chalk.bold('0')} or ${chalk.bold('100')}.`);
      }
    }

    const isValidVersion = (version: string): boolean => !!semver.valid(version) || /^\d+\.\d+$/.test(version) || /^\d+$/.test(version);
    if (this.targetBinaryRange !== null && this.targetBinaryRange !== undefined && !isValidVersion(this.targetBinaryRange)) {
      return failure(ErrorCodes.Exception, "Invalid binary version(s) for a release.");
    }

    let patch : models.LiveUpdateReleaseModification = {
      targetBinaryRange: this.targetBinaryRange,
      isMandatory: this.isMandatory,
      isDisabled: this.isDisabled,
      description: this.description,
    };

    if (this.rollout != null) {
      patch.rollout = parseInt(this.rollout);
    }
    
    try {
      const httpRequest = await out.progress("Patching CodePush release...", clientRequest<models.LiveUpdateRelease>(
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