import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp, shortName, longName, required, hasArg, position, name } from "../../util/commandline";
import { out } from "../../util/interaction";
import { DefaultApp } from "../../util/profile";
import { inspect } from "util";
import { MobileCenterClient, models, clientRequest, clientCall } from "../../util/apis";
const _ = require("lodash");
const chalk = require("chalk");
import * as semver from "semver";

const debug = require("debug")("mobile-center-cli:commands:codepush:patch");

@help("Update the metadata for an existing release")
export default class PatchCommand extends AppCommand {
  
  @help("CodePush deployment name")
  @required
  @name("ExistingDeploymentName")
  @position(0)
  public deploymentName: string;

  @help("CodePush release label")
  @required
  @name("ExistingReleaseLabel")
  @position(1)
  public releaseLabel: string;

  @help("update whether the release should be considered mandatory or not")
  @shortName("m")
  @longName("mandatory")
  @hasArg
  public isMandatory: string;

  @help("update the description associated with the release")
  @shortName("x")
  @longName("disabled")
  @hasArg
  public isDisabled: string;

  @help("update the semver range that indicates which binary version(s) a release")
  @shortName("t")
  @longName("targetBinaryVersion")
  @hasArg
  public targetBinaryRange: string;

  @help("update the description associated with the release")
  @shortName("des")
  @longName("description")
  @hasArg
  public description: string;

  @help("allows you to increase the rollout percentage of the target release")
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

    if (this.targetBinaryRange == null && this.isDisabled == null && this.isMandatory == null && this.description == null && this.rollout == null) {
      return failure(ErrorCodes.Exception, "At least one property must be specified to patch a release.");
    }

    if (this.isMandatory != null) {
      if (this.isMandatory != 'true' && this.isMandatory != 'false') {
        return failure(ErrorCodes.Exception, `Mandatory value should be either ${chalk.bold(true)} or ${chalk.bold(false)}.`);  
      }
    }

    if (this.isDisabled != null) {
      if (this.isDisabled != 'true' && this.isDisabled != 'false') {
        return failure(ErrorCodes.Exception, `Disabled value should be either ${chalk.bold(true)} or ${chalk.bold(false)}.`);  
      }
    }

    if (this.rollout != null) {
      if (parseInt(this.rollout) < 0 || parseInt(this.rollout) > 100) {
        return failure(ErrorCodes.Exception, `Rollout value should be integer value between ${chalk.bold(0)} or ${chalk.bold(100)}.`);
      }
    }

    const isValidVersion = (version: string): boolean => !!semver.valid(version) || /^\d+\.\d+$/.test(version);
    if (this.targetBinaryRange != null && !isValidVersion(this.targetBinaryRange)) {
      return failure(ErrorCodes.Exception, "Invalid binary version(s) for a release.");      
    }

    let patch: models.LiveUpdateReleaseModification;
    if (this.rollout!=null) {
      patch = {
        targetBinaryRange: this.targetBinaryRange,
        isMandatory: this.isMandatory === 'true' || this.isMandatory === 'True',
        isDisabled: this.isDisabled === 'true' || this.isDisabled === 'True',
        description: this.description,
        rollout: parseInt(this.rollout)
      }
    } else {
      patch = {
        targetBinaryRange: this.targetBinaryRange,
        isMandatory: this.isMandatory === 'true' || this.isMandatory === 'True',
        isDisabled: this.isDisabled === 'true' || this.isDisabled === 'True',
        description: this.description,
      }
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