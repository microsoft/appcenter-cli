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
import { isValidVersion, isValidRollout, isValidDeployment, isReactNativeProject } from "./lib/validation-utils";
import { VersionSearchParams, getReactNativeProjectAppVersion, runReactNativeBundleCommand, isValidPlatform } from "./lib/react-native-utils";

const debug = require("debug")("mobile-center-cli:commands:codepush:release-react");

@help("Release a React Native update to an app deployment")
export default class CodePushReleaseReactCommand extends CodePushReleaseCommandSkeleton {
  @help("Name of the generated JS bundle file. If unspecified, the standard bundle name will be used, depending on the specified platform: \"main.jsbundle\" (iOS), \"index.android.bundle\" (Android) or \"index.windows.bundle\" (Windows)")
  @shortName("b")
  @longName("bundle-name")
  @hasArg
  public bundleName: string;

  @help("Specifies whether to generate a dev or release build")
  @shortName("dev")
  @longName("development")
  public development: boolean;

  @help("Path to the app's entry Javascript file. If omitted, \"index.<platform>.js\" and then \"index.js\" will be used (if they exist)")
  @shortName("e")
  @longName("entry-file")
  public entryFile: string;

  @help("Path to the gradle file which specifies the binary version you want to target this release at (android only).")
  @shortName("g")
  @longName("gradle-file")
  public gradleFile: string;

  @help("Path to the plist file which specifies the binary version you want to target this release at (iOS only).")
  @shortName("p")
  @longName("plist-file")
  public plistFile: string;

  @help("Prefix to append to the file name when attempting to find your app's Info.plist file (iOS only).")
  @shortName("pre")
  @longName("plist-file-prefix")
  public plistFilePrefix: string;

  @help("Path to where the sourcemap for the resulting bundle should be written. If omitted, a sourcemap will not be generated.")
  @shortName("s")
  @longName("sourcemap-output")
  public sourcemapOutput: string;

  @help("Path to where the bundle and sourcemap should be written. If omitted, a bundle and sourcemap will not be written.")
  @shortName("o")
  @longName("output-dir")
  public outputDir: string;

  @help("Semver expression that specifies the binary app version(s) this release is targeting (e.g. 1.1.0, ~1.2.3)")
  @shortName("t")
  @longName("target-binary-version")
  @hasArg
  public specifiedTargetBinaryVersion: string;

  private platform: string;

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    if (!(await isValidDeployment(client, this.app, this.deploymentName))) {
      return failure(ErrorCodes.InvalidParameter, `Deployment "${this.deploymentName}" does not exist.`);
    }

    const appInfo = (await out.progress("Creating CodePush release...", clientRequest<models.App>(
      (cb) => client.apps.get(this.app.ownerName, this.app.appName, cb)))).result;
    this.platform = appInfo.platform.toLowerCase();

    this.outputDir = this.outputDir || await pfs.mkTempDir("code-push");

    if (!isValidPlatform(this.platform)) {
      return failure(ErrorCodes.Exception, "Platform must be \"android\", \"ios\", or \"windows\".")
    }

    if (!this.bundleName) {
      this.bundleName = this.platform === "ios"
        ? "main.jsbundle"
        : `index.${this.platform}.bundle`;
    }

    if (!isReactNativeProject()) {
      return failure(ErrorCodes.Exception, "The project in the CWD is not a React Native project.")
    }

    if (!this.entryFile) {
      this.entryFile = `index.${this.platform}.js`;
      if (await fileDoesNotExistOrIsDirectory(this.entryFile)) {
        this.entryFile = "index.js";
      }

      if (await fileDoesNotExistOrIsDirectory(this.entryFile)) {
        return failure(ErrorCodes.NotFound, `Entry file "index.${this.platform}.js" or "index.js" does not exist.`);
      }
    } else {
      if (await fileDoesNotExistOrIsDirectory(this.entryFile)) {
        return failure(ErrorCodes.NotFound, `Entry file "${this.entryFile}" does not exist.`);
      }
    }

    if (this.outputDir) {
      this.sourcemapOutput = path.join(this.outputDir, this.bundleName + ".map");
    }

    this.targetBinaryVersion = this.specifiedTargetBinaryVersion;

    if (this.targetBinaryVersion && !isValidVersion(this.targetBinaryVersion)) {
      return failure(ErrorCodes.InvalidParameter, "Invalid binary version(s) for a release.");
    } else if (!this.targetBinaryVersion) {
      const versionSearchParams: VersionSearchParams = {
        platform: this.platform,
        plistFile: this.plistFile,
        plistFilePrefix: this.plistFilePrefix,
        gradleFile: this.gradleFile
      } as VersionSearchParams;
      this.targetBinaryVersion = await getReactNativeProjectAppVersion(versionSearchParams);
    }

    try {
      await createEmptyTempReleaseFolder(this.outputDir);

      await removeReactTmpDir();

      await runReactNativeBundleCommand(this.bundleName, this.development, this.entryFile, this.outputDir, this.platform, this.sourcemapOutput);

      out.text(chalk.cyan("\nReleasing update contents to CodePush:\n"));

      return await this.release(client);
    } catch (error) {
      debug(`Failed to release a CodePush update - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "Failed to release a CodePush update.")
    } finally {
      pfs.rmDir(this.outputDir);
    }
  }
}
