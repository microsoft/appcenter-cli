import { AppCommand, CommandArgs, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success, defaultValue } from "../../util/commandline";
import CodePushReleaseCommandSkeleton from "./lib/release-command-skeleton"
import CodePushReleaseCommand from "./release"
import { MobileCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";
import { out, prompt } from "../../util/interaction";
import { inspect } from "util";
import * as pfs from "../../util/misc/promisfied-fs";
import * as fs from "fs";
import * as chalk from "chalk";
import { sign, zip } from "./lib/update-contents-tasks";
import * as path from "path";
import { fileDoesNotExistOrIsDirectory, createEmptyTempReleaseFolder, removeReactTmpDir } from "./lib/file-utils";
import { isValidVersion, isValidRollout, isValidDeployment } from "./lib/validation-utils";
import { isValidPlatform, getCordovaOrPhonegapCLI, getCordovaProjectAppVersion } from "./lib/cordova-utils";

var childProcess = require("child_process");
export var execSync = childProcess.execSync;

const debug = require("debug")("mobile-center-cli:commands:codepush:release-cordova");

@help("Release a Cordova update to an app deployment")
export default class CodePushReleaseCordovaCommand extends CodePushReleaseCommandSkeleton {
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

  private platform: string;

  private readonly projectRoot: string = process.cwd();

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    if ((await isValidDeployment(client, this.app, this.specifiedDeploymentName))) {
      return failure(ErrorCodes.InvalidParameter, `Deployment "${this.specifiedDeploymentName}" does not exist.`);
    } else {
      this.deploymentName = this.specifiedDeploymentName;
    }

    const appInfo = (await out.progress("Getting app info...", clientRequest<models.App>(
      (cb) => client.apps.get(this.app.ownerName, this.app.appName, cb)))).result;
    this.platform = appInfo.platform.toLowerCase();

    if (!isValidPlatform(this.platform)) {
      return failure(ErrorCodes.InvalidParameter, `Platform must be either "ios" or "android".`);
    }

    if (this.specifiedTargetBinaryVersion) {
      this.targetBinaryVersion = this.specifiedTargetBinaryVersion
    } else {
      this.targetBinaryVersion = await getCordovaProjectAppVersion();
    }

    if (!isValidVersion(this.targetBinaryVersion)) {
      return failure(ErrorCodes.InvalidParameter, "Invalid binary version(s) for a release.");
    }

    this.updateContentsPath = this.getOutputFolder();
    const cordovaCommand: string = this.getCordovaCommand();

    try {
      var cordovaCLI: string = getCordovaOrPhonegapCLI();
    } catch (e) {
      return failure(ErrorCodes.Exception, `Unable to ${cordovaCommand} project. Please ensure that either the Cordova or PhoneGap CLI is installed.`);
    }

    out.text(chalk.cyan(`Running "${cordovaCLI} ${cordovaCommand}" command:\n`));
    try {
      execSync([cordovaCLI, cordovaCommand, this.platform, "--verbose"].join(" "), { stdio: "inherit" });
    } catch (error) {
      debug(`Failed to release a CodePush update - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, `Unable to ${cordovaCommand} project. Please ensure that the CWD represents a Cordova project and that the "${this.platform}" platform was added by running "${cordovaCLI} platform add ${this.platform}".`);
    }

    out.text(chalk.cyan("\nReleasing update contents to CodePush:\n"));
    return await this.release(client);
  }

  private getOutputFolder(): string {
    const platformFolder: string = path.join(this.projectRoot, "platforms", this.platform);
    let outputFolder: string;

    if (this.platform === "ios") {
      outputFolder = path.join(platformFolder, "www");
    } else if (this.platform === "android") {
      outputFolder = path.join(platformFolder, "assets", "www");
    }

    return outputFolder;
  }

  private getCordovaCommand(): string {
    return this.build ? (this.isReleaseBuildType ? "build --release" : "build") : "prepare";
  }
}
