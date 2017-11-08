import { CommandArgs, AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success, defaultValue } from "../../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
import { out, prompt } from "../../../util/interaction";
import { inspect } from "util";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as fs from "fs";
import * as chalk from "chalk";
import { sign, zip } from "../lib/update-contents-tasks";
import { isBinaryOrZip } from "../lib/file-utils";
import { isValidVersion, isValidRollout, isValidDeployment } from "../lib/validation-utils";
import * as debug from "debug";

export default class CodePushReleaseCommandSkeleton extends AppCommand {
  @help("Deployment to release the update to")
  @shortName("d")
  @longName("deployment-name")
  @defaultValue("Staging")
  @hasArg
  public deploymentName: string;

  @help("Description of the changes made to the app in this release")
  @shortName("des")
  @longName("description")
  @hasArg
  public description: string;

  @help("Specifies whether this release should be immediately downloadable")
  @shortName("x")
  @longName("disabled")
  public disabled: boolean;

  @help("Specifies whether this release should be considered mandatory")
  @shortName("m")
  @longName("mandatory")
  public mandatory: boolean;

  @help("Specifies the location of a RSA private key to sign the release with." + chalk.yellow("NOTICE:") + " use it for react native applications only, client SDK on other platforms will be ignoring signature verification for now!")
  @shortName("k")
  @longName("private-key-path")
  @hasArg
  public privateKeyPath: string;

  @help("When this flag is set, releasing a package that is identical to the latest release will produce a warning instead of an error")
  @shortName("dre")
  @longName("no-duplicate-release-error")
  public noDuplicateReleaseError: boolean;

  @help("Percentage of users this release should be available to")
  @shortName("r")
  @longName("rollout")
  @defaultValue("100")
  @hasArg
  public specifiedRollout: string;

  protected rollout: number;

  protected hasBeenValided: boolean;

  protected updateContentsPath: string;

  protected targetBinaryVersion: string;

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    throw new Error("For dev purposes only!");
  }

  protected async validate(client: MobileCenterClient): Promise<CommandResult> {
    if (!isValidVersion(this.targetBinaryVersion)) {
      return failure(ErrorCodes.InvalidParameter, "Invalid binary version(s) for a release.");
    }

    if (!Number.isSafeInteger(this.rollout) || !isValidRollout(this.rollout)) {
        return failure(ErrorCodes.Exception, `Rollout value should be integer value between ${chalk.bold('0')} or ${chalk.bold('100')}.`);
    }

    if (!(await isValidDeployment(client, this.app, this.deploymentName))) {
      return failure(ErrorCodes.InvalidParameter, `Deployment "${this.deploymentName}" does not exist.`);
    }

    return success();
  }

  protected async release(client: MobileCenterClient): Promise<CommandResult> {
    if (isBinaryOrZip(this.updateContentsPath)) {
      return failure(ErrorCodes.InvalidParameter, "It is unnecessary to package releases in a .zip or binary file. Please specify the direct path to the update content's directory (e.g. /platforms/ios/www) or file (e.g. main.jsbundle).");
    }

    this.rollout = Number(this.specifiedRollout);

    const validationResult: CommandResult =  await this.validate(client);
    if (!validationResult.succeeded) return validationResult;

    if (this.privateKeyPath && !(await prompt.confirm("You are going to use code signing which is experimental feature. If it is the first time you sign bundle please make sure that you have configured a public key for your client SDK and released new binary version of your app. Also, be sure that this release is targeting to new binary version. You can find more information about code signing feature here: https://github.com/Microsoft/code-push/blob/master/cli/README.md#code-signing  Do you want to continue?"))) {
      return success();
    }

    if (this.privateKeyPath) {
      await sign(this.privateKeyPath, this.updateContentsPath);
    }

    const updateContentsZipPath = await zip(this.updateContentsPath);

    try {
      const httpRequest = await out.progress("Creating CodePush release...", clientRequest<models.CodePushRelease>(
        (cb) => client.codePushDeploymentReleases.create(
          this.deploymentName,
          this.targetBinaryVersion,
          this.app.ownerName,
          this.app.appName,
          {
            packageParameter: fs.createReadStream(updateContentsZipPath),
            deploymentName1: this.deploymentName,
            description: this.description,
            disabled: this.disabled, 
            mandatory: this.mandatory, 
            noDuplicateReleaseError: this.noDuplicateReleaseError,
            rollout: this.rollout,
          },
          cb)));

      out.text(`Successfully released an update containing the "${this.updateContentsPath}" `
        + `${fs.lstatSync(this.updateContentsPath).isDirectory() ? "directory" : "file"}`
        + ` to the "${this.deploymentName}" deployment of the "${this.app.appName}" app.`);

      return success();
    } catch (error) {
      debug(`Failed to release a CodePush update - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, error.response.body);
    }
  }
}
