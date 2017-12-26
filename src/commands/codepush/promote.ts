import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, shortName, longName, hasArg, position, name } from "../../util/commandline";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as chalk from "chalk";
import { isValidRollout, isValidRange } from "./lib/validation-utils";

const debug = require("debug")("appcenter-cli:commands:codepush:promote");

@help("Create a new release for the destination deployment, which includes the exact code and metadata from the latest release of the source deployment")
export default class CodePushPromoteCommand extends AppCommand {

  @help("Specifies destination deployment name")
  @required
  @longName("dest-deployment-name")
  @shortName("d")
  @hasArg
  public destDeploymentName: string;

  @help("Specifies source deployment name")
  @required
  @shortName("s")
  @longName("source-deployment-name")
  @hasArg
  public sourceDeploymentName: string;

  @help("Specifies description of the changes made to the app with this release")
  @shortName("d")
  @longName("description")
  @hasArg
  public description: string;

  @help("Allows you to pick the specified label from the source deployment and promote it to the destination deployment")
  @shortName("l")
  @longName("label")
  @hasArg
  public label: string;

  @help("Specifies whether this release should be considered mandatory. (Putting -m flag means mandatory)")
  @shortName("m")
  public isMandatory: boolean;

  @help("Specifies whether this release should be immediately downloadable. (Putting -x flag means disabled)")
  @shortName("x")
  public isDisabled: boolean;

  @help("Specifies that if the update is identical to the latest release on the deployment, the CLI should generate a warning instead of an error")
  @longName("no-duplicate-release-error")
  public noDuplicateReleaseError: boolean;

  @help("Specifies percentage of users this release should be immediately available to. (The specified number must be an integer between 1 and 100)")
  @shortName("r")
  @longName("rollout")
  @hasArg
  public rollout: string;

  @help("Specifies binary app version(s) that specifies this release is targeting for. (The value must be a semver expression such as 1.1.0, ~1.2.3)")
  @shortName("t")
  @longName("target-binary-version")
  @hasArg
  public targetBinaryRange: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    const rollout = Number(this.rollout);
    if (this.rollout != null && (!Number.isSafeInteger(rollout) || !isValidRollout(rollout))) {
      return failure(ErrorCodes.Exception, `Rollout value should be integer value between ${chalk.bold('0')} or ${chalk.bold('100')}.`);
    }

    if (this.targetBinaryRange != null && !isValidRange(this.targetBinaryRange)) {
      return failure(ErrorCodes.Exception, "Invalid binary version(s) for a release.");
    }

    let promote : models.CodePushReleasePromote = {
      targetBinaryRange: this.targetBinaryRange,
      description: this.description,
      label: this.label,
      isDisabled: this.isDisabled,
      isMandatory: this.isMandatory
    };

    if (this.rollout != null) {
      promote.rollout = rollout;
    }

    try {
      debug("Promote CodePush release");
      const httpRequest = await out.progress("Promoting CodePush release...", clientRequest<models.CodePushRelease>(
        (cb) => client.codepush.codePushDeployments.promote(app.appName, this.sourceDeploymentName, this.destDeploymentName, app.ownerName
          , { release: promote }, cb)));
    } catch (error) {
      debug(`Failed to promote CodePush release - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, error.response.body);
    }

    out.text(`Successfully promoted ${this.label ? `'${this.label}' of` : ''} the '${this.sourceDeploymentName}' deployment of the '${this.identifier}' app to the '${this.destDeploymentName}' deployment.`);
    return success();
  }
}
