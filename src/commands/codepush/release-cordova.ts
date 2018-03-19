import { CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName } from "../../util/commandline";
import CodePushReleaseCommandSkeleton from "./lib/release-command-skeleton"
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as chalk from "chalk";
import * as path from "path";
import { isValidRange, isValidDeployment } from "./lib/validation-utils";
import { isValidOS, isValidPlatform, getCordovaOrPhonegapCLI, getCordovaProjectAppVersion } from "./lib/cordova-utils";

var childProcess = require("child_process");
export var execSync = childProcess.execSync;

const debug = require("debug")("appcenter-cli:commands:codepush:release-cordova");

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

  private os: string;

  private platform: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    if (!(await isValidDeployment(client, this.app, this.specifiedDeploymentName))) {
      return failure(ErrorCodes.InvalidParameter, `Deployment "${this.specifiedDeploymentName}" does not exist.`);
    } else {
      this.deploymentName = this.specifiedDeploymentName;
    }

    const appInfo = (await out.progress("Getting app info...", clientRequest<models.AppResponse>(
      (cb) => client.account.apps.get(this.app.appName, this.app.ownerName, cb)))).result;
    this.os = appInfo.os.toLowerCase();
    this.platform = appInfo.platform.toLowerCase();

    if (!isValidOS(this.os)) {
      return failure(ErrorCodes.InvalidParameter, `Platform must be either "ios" or "android".`);
    }

    if (!isValidPlatform(this.platform)) {
      return failure(ErrorCodes.Exception, `Platform must be "Cordova".`);
    }

    if (this.specifiedTargetBinaryVersion) {
      this.targetBinaryVersion = this.specifiedTargetBinaryVersion
    } else {
      this.targetBinaryVersion = await getCordovaProjectAppVersion();
    }

    if (!isValidRange(this.targetBinaryVersion)) {
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
      execSync([cordovaCLI, cordovaCommand, this.os, "--verbose"].join(" "), { stdio: "inherit" });
    } catch (error) {
      debug(`Failed to release a CodePush update - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, `Unable to ${cordovaCommand} project. Please ensure that the CWD represents a Cordova project and that the "${this.os}" platform was added by running "${cordovaCLI} platform add ${this.os}".`);
    }

    out.text(chalk.cyan("\nReleasing update contents to CodePush:\n"));
    return await this.release(client);
  }

  private getOutputFolder(): string {
    const projectRoot: string = process.cwd();
    const platformFolder: string = path.join(projectRoot, "platforms", this.os);
    let outputFolder: string;

    if (this.os === "ios") {
      outputFolder = path.join(platformFolder, "www");
    } else if (this.os === "android") {
      outputFolder = path.join(platformFolder, "assets", "www");
    }

    return outputFolder;
  }

  private getCordovaCommand(): string {
    return this.build ? (this.isReleaseBuildType ? "build --release" : "build") : "prepare";
  }
}
