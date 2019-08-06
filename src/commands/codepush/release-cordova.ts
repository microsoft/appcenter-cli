import { CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName } from "../../util/commandline";
import CodePushReleaseCommandBase from "./lib/codepush-release-command-base";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import chalk from "chalk";
import * as path from "path";
import * as fs from "fs";
import { isValidRange, isValidDeployment } from "./lib/validation-utils";
import { isValidOS, isValidPlatform, getCordovaOrPhonegapCLI, getCordovaProjectAppVersion } from "./lib/cordova-utils";
import * as childProcess from "child_process";

export let execSync = childProcess.execSync;

const debug = require("debug")("appcenter-cli:commands:codepush:release-cordova");

@help("Release a Cordova update to an app deployment")
export default class CodePushReleaseCordovaCommand extends CodePushReleaseCommandBase {
  @help(`Invoke "cordova build" instead of "cordova prepare"`)
  @shortName("b")
  @longName("build")
  public build: boolean;

  @help("If \"build\" option is true specifies whether perform a release build")
  @longName("is-release-build-type")
  public isReleaseBuildType: boolean;

  @help("Semver expression that specifies the binary app version(s) this release is targeting (e.g. 1.1.0, ~1.2.3)")
  @shortName("t")
  @longName("target-binary-version")
  @hasArg
  public specifiedTargetBinaryVersion: string;

  private os: string;

  private platform: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    if (!(await isValidDeployment(client, this.app, this.specifiedDeploymentName))) {
      return failure(ErrorCodes.InvalidParameter, `Deployment "${this.specifiedDeploymentName}" does not exist.`);
    } else {
      this.deploymentName = this.specifiedDeploymentName;
    }

    const appInfo = (await out.progress("Getting app info...", clientRequest<models.AppResponse>(
      (cb) => client.apps.get(this.app.ownerName, this.app.appName, cb)))).result;
    this.os = appInfo.os.toLowerCase();
    this.platform = appInfo.platform.toLowerCase();

    if (!isValidOS(this.os)) {
      return failure(ErrorCodes.InvalidParameter, `Platform must be either "ios" or "android".`);
    }

    if (!isValidPlatform(this.platform)) {
      return failure(ErrorCodes.Exception, `Platform must be "Cordova".`);
    }

    if (this.specifiedTargetBinaryVersion) {
      this.targetBinaryVersion = this.specifiedTargetBinaryVersion;
    } else {
      this.targetBinaryVersion = await getCordovaProjectAppVersion();
    }

    if (!isValidRange(this.targetBinaryVersion)) {
      return failure(ErrorCodes.InvalidParameter, "Invalid binary version(s) for a release.");
    }

    const cordovaCommand: string = this.getCordovaCommand();

    let cordovaCLI: string;
    try {
      cordovaCLI = getCordovaOrPhonegapCLI();
    } catch (e) {
      return failure(ErrorCodes.Exception, `Unable to ${cordovaCommand} project. Please ensure that either the Cordova or PhoneGap CLI is installed.`);
    }

    out.text(chalk.cyan(`Running "${cordovaCLI} ${cordovaCommand}" command:\n`));
    try {
      execSync([cordovaCLI, cordovaCommand, this.os, "--verbose"].join(" "), { stdio: "inherit" });
    } catch (error) {
      debug(`Failed to release a CodePush update - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, `Unable to ${cordovaCommand} project. Please ensure that the CWD represents a Cordova project and that the "${this.os}" platform was added by running "${cordovaCLI} platform add ${this.os}".`);
    }

    try {
      this.updateContentsPath = this.getOutputFolder();
    } catch (error) {
      debug(`Failed to release a CodePush update - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, `No output folder found. Please ensure that the CWD represents a Cordova project and that the "${this.os}" platform was added by running "${cordovaCLI} platform add ${this.os}".`);
    }

    out.text(chalk.cyan("\nReleasing update contents to CodePush:\n"));
    return await this.release(client);
  }

  private getOutputFolder(): string {
    const projectRoot: string = process.cwd();
    const platformFolder: string = path.join(projectRoot, "platforms", this.os);

    if (this.os === "ios") {
      return path.join(platformFolder, "www");
    } else if (this.os === "android") {
      // Since cordova-android 7 assets directory moved to android/app/src/main/assets instead of android/assets
      const outputFolderVer7 = path.join(platformFolder, "app", "src", "main", "assets", "www");
      const outputFolderPre7 = path.join(platformFolder, "assets", "www");
      if (fs.existsSync(outputFolderVer7)) {
        return outputFolderVer7;
      } else if (fs.existsSync(outputFolderPre7)) {
        return outputFolderPre7;
      }
    }
    throw new Error(`${this.os} output folder does not exists`);
  }

  private getCordovaCommand(): string {
    return this.build ? (this.isReleaseBuildType ? "build --release" : "build") : "prepare";
  }
}
