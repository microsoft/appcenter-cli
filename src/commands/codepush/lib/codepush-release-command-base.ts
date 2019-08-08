import { AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName, success, defaultValue } from "../../../util/commandline";
import { CommandArgs } from "../../../util/commandline/command";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as fs from "fs";
import * as pfs from "../../../util/misc/promisfied-fs";
import chalk from "chalk";
import { sign, zip } from "./update-contents-tasks";
import { isBinaryOrZip, getLastFolderInPath, moveReleaseFilesInTmpFolder, isDirectory } from "./file-utils";
import { isValidRange, isValidRollout, isValidDeployment, validateVersion } from "./validation-utils";
import FileUploadClient, { MessageLevel } from "appcenter-file-upload-client";
import { DefaultApp } from "../../../util/profile";

const debug = require("debug")("appcenter-cli:commands:codepush:release-base");

export default class CodePushReleaseCommandBase extends AppCommand {
  @help("Deployment to release the update to")
  @shortName("d")
  @longName("deployment-name")
  @defaultValue("Staging")
  @hasArg
  public specifiedDeploymentName: string;

  @help("Description of the changes made to the app in this release")
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
  @longName("disable-duplicate-release-error")
  public disableDuplicateReleaseError: boolean;

  @help("Percentage of users this release should be available to")
  @shortName("r")
  @longName("rollout")
  @defaultValue("100")
  @hasArg
  public specifiedRollout: string;

  protected rollout: number;

  // We assume that if this field is assigned than it is already validated (help us not to validate twice).
  protected deploymentName: string;

  protected updateContentsPath: string;

  protected targetBinaryVersion: string;

  private readonly fileUploadClient: FileUploadClient;

  constructor(args: CommandArgs) {
    super(args);

    this.fileUploadClient = new FileUploadClient();
  }

  public async run(client: AppCenterClient): Promise<CommandResult> {
    throw new Error("For dev purposes only!");
  }

  protected async release(client: AppCenterClient): Promise<CommandResult> {
    this.rollout = Number(this.specifiedRollout);

    const validationResult: CommandResult =  await this.validate(client);
    if (!validationResult.succeeded) { return validationResult; }

    this.deploymentName = this.specifiedDeploymentName;

    if (this.privateKeyPath) {
      const appInfo = (await out.progress("Getting app info...", clientRequest<models.AppResponse>(
        (cb) => client.apps.get(this.app.ownerName, this.app.appName, cb)))).result;
      const platform = appInfo.platform.toLowerCase();

      // In React-Native case we should add "CodePush" name folder as root for relase files for keeping sync with React Native client SDK.
      // Also single file also should be in "CodePush" folder.
      if (platform === "react-native" && (getLastFolderInPath(this.updateContentsPath) !== "CodePush" || !isDirectory(this.updateContentsPath))) {
        await moveReleaseFilesInTmpFolder(this.updateContentsPath).then((tmpPath: string) => { this.updateContentsPath = tmpPath; });
      }

      await sign(this.privateKeyPath, this.updateContentsPath);
    }

    const updateContentsZipPath = await zip(this.updateContentsPath);

    try {
      const app = this.app;

      this.checkTargetBinaryVersion(this.targetBinaryVersion);

      const releaseUpload = this.upload(client, app, this.deploymentName, updateContentsZipPath);
      await out.progress("Uploading bundle...", releaseUpload);
      await out.progress("Creating CodePush release...",  this.createRelease(client, app, this.deploymentName, {
        releaseUpload: await releaseUpload,
        targetBinaryVersion: this.targetBinaryVersion,
        description: this.description,
        disabled: this.disabled,
        mandatory: this.mandatory,
        rollout: this.rollout
      }));

      out.text(`Successfully released an update containing the "${this.updateContentsPath}" `
        + `${fs.lstatSync(this.updateContentsPath).isDirectory() ? "directory" : "file"}`
        + ` to the "${this.deploymentName}" deployment of the "${this.app.appName}" app.`);

      return success();
    } catch (error) {
      if (error.response && error.response.statusCode === 409 && this.disableDuplicateReleaseError) {
        // 409 (Conflict) status code means that uploaded package is identical
        // to the contents of the specified deployment's current release
        console.warn(chalk.yellow("[Warning] " + error.response.body));
        return success();
      } else {
        debug(`Failed to release a CodePush update - ${inspect(error)}`);
        return failure(ErrorCodes.Exception, error.response ? error.response.body : error);
      }
    } finally {
      await pfs.rmDir(updateContentsZipPath);
    }
  }

  private async upload(client: AppCenterClient, app: DefaultApp, deploymentName: string, updateContentsZipPath: string): Promise<models.CodePushReleaseUpload> {
    debug(`Starting release upload on deployment: ${deploymentName} with zip file: ${updateContentsZipPath}`);

    const releaseUpload = (await clientRequest<models.CodePushReleaseUpload>(
      (cb) => client.codePushDeploymentUpload.create(
        deploymentName,
        app.ownerName,
        app.appName,
        cb
      )
    )).result;

    await this.uploadBundle(releaseUpload, updateContentsZipPath);
    return releaseUpload;
  }

  public async createRelease(client: AppCenterClient, app: DefaultApp, deploymentName: string, uploadedRelease: models.CodePushUploadedRelease): Promise<void> {
    debug(`Starting release process on deployment: ${deploymentName} with uploaded release metadata: ${inspect(uploadedRelease)}`);

    await clientRequest<models.CodePushRelease>(
      (cb) => client.codePushDeploymentReleases.create(
        deploymentName,
        uploadedRelease,
        app.ownerName,
        app.appName,
        cb
      )
    );
  }

  private async uploadBundle(releaseUpload: models.CodePushReleaseUpload, bundleZipPath: string): Promise<void> {
    debug(`Starting to upload the release bundle: ${bundleZipPath} with upload data: ${inspect(releaseUpload)}`);

    await this.fileUploadClient.upload({
      assetId: releaseUpload.id,
      assetDomain: releaseUpload.uploadDomain,
      assetToken: releaseUpload.token,
      file: bundleZipPath,
      onMessage: (message: string, level: MessageLevel) => {
        debug(`Upload client message: ${message}`);
      }
    });
  }

  private checkTargetBinaryVersion(version: string): void {
    const warningVersion = validateVersion(version);

    if (warningVersion) {
      out.text(`\nYour target-binary-version "${version}" will be treated as "${warningVersion}".\n`);
    }
  }

  private async validate(client: AppCenterClient): Promise<CommandResult> {
    if (isBinaryOrZip(this.updateContentsPath)) {
      return failure(ErrorCodes.InvalidParameter, "It is unnecessary to package releases in a .zip or binary file. Please specify the direct path to the update content's directory (e.g. /platforms/ios/www) or file (e.g. main.jsbundle).");
    }

    if (!isValidRange(this.targetBinaryVersion)) {
      return failure(ErrorCodes.InvalidParameter, "Invalid binary version(s) for a release.");
    }

    if (!Number.isSafeInteger(this.rollout) || !isValidRollout(this.rollout)) {
      return failure(ErrorCodes.InvalidParameter, `Rollout value should be integer value between ${chalk.bold("0")} or ${chalk.bold("100")}.`);
    }

    if (!this.deploymentName && !(await isValidDeployment(client, this.app, this.specifiedDeploymentName))) {
      return failure(ErrorCodes.InvalidParameter, `Deployment "${this.specifiedDeploymentName}" does not exist.`);
    }

    return success();
  }
}
