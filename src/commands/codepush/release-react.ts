import { CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName } from "../../util/commandline";
import CodePushReleaseCommandSkeleton from "./lib/release-command-skeleton"
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as fs from "fs";
import * as pfs from "../../util/misc/promisfied-fs";
import * as chalk from "chalk";
import * as path from "path";
import { fileDoesNotExistOrIsDirectory, createEmptyTmpReleaseFolder, removeReactTmpDir } from "./lib/file-utils";
import { isValidRange, isValidDeployment } from "./lib/validation-utils";
import { VersionSearchParams, getReactNativeProjectAppVersion, runReactNativeBundleCommand, isValidOS, isValidPlatform, isReactNativeProject } from "./lib/react-native-utils";

const debug = require("debug")("appcenter-cli:commands:codepush:release-react");

@help("Release a React Native update to an app deployment")
export default class CodePushReleaseReactCommand extends CodePushReleaseCommandSkeleton {
  @help("Name of the generated JS bundle file. If unspecified, the standard bundle name will be used, depending on the specified platform: \"main.jsbundle\" (iOS), \"index.android.bundle\" (Android) or \"index.windows.bundle\" (Windows)")
  @shortName("b")
  @longName("bundle-name")
  @hasArg
  public bundleName: string;

  @help("Specifies whether to generate a dev or release build")
  @longName("development")
  public development: boolean;

  @help("Path to the app's entry Javascript file. If omitted, \"index.<platform>.js\" and then \"index.js\" will be used (if they exist)")
  @shortName("e")
  @longName("entry-file")
  @hasArg
  public entryFile: string;

  @help("Path to the gradle file which specifies the binary version you want to target this release at (android only)")
  @shortName("g")
  @longName("gradle-file")
  @hasArg
  public gradleFile: string;

  @help("Path to the plist file which specifies the binary version you want to target this release at (iOS only)")
  @shortName("p")
  @hasArg
  @longName("plist-file")
  public plistFile: string;

  @help("Prefix to append to the file name when attempting to find your app's Info.plist file (iOS only)")
  @longName("plist-file-prefix")
  @hasArg
  public plistFilePrefix: string;

  @help("Path to where the sourcemap for the resulting bundle should be written. If omitted, a sourcemap will not be generated")
  @shortName("s")
  @longName("sourcemap-output")
  public sourcemapOutput: string;

  @help("Path to where the bundle and sourcemap should be written. If omitted, a bundle and sourcemap will not be written")
  @shortName("o")
  @longName("output-dir")
  @hasArg
  public outputDir: string;

  @help("Semver expression that specifies the binary app version(s) this release is targeting (e.g. 1.1.0, ~1.2.3)")
  @shortName("t")
  @longName("target-binary-version")
  @hasArg
  public specifiedTargetBinaryVersion: string;

  private os: string;

  private platform: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    if (!isReactNativeProject()) {
      return failure(ErrorCodes.InvalidParameter, "The project in the CWD is not a React Native project.");
    }

    if (!(await isValidDeployment(client, this.app, this.specifiedDeploymentName))) {
      return failure(ErrorCodes.InvalidParameter, `Deployment "${this.specifiedDeploymentName}" does not exist.`);
    } else {
      this.deploymentName = this.specifiedDeploymentName;
    }

    const appInfo = (await out.progress("Getting app info...", clientRequest<models.AppResponse>(
      (cb) => client.account.apps.get(this.app.appName, this.app.ownerName, cb)))).result;
    this.os = appInfo.os.toLowerCase();
    this.platform = appInfo.platform.toLowerCase();

    this.updateContentsPath = this.outputDir || await pfs.mkTempDir("code-push");
    
    // we have to add "CodePush" root forlder to make update contents file structure 
    // to be compatible with React Native client SDK
    fs.mkdirSync(path.join(this.updateContentsPath, "CodePush"));

    if (!isValidOS(this.os)) {
      return failure(ErrorCodes.InvalidParameter, `OS must be "android", "ios", or "windows".`);
    }

    if (!isValidPlatform(this.platform)) {
      return failure(ErrorCodes.Exception, `Platform must be "React Native".`);
    }

    if (!this.bundleName) {
      this.bundleName = this.os === "ios"
        ? "main.jsbundle"
        : `index.${this.os}.bundle`;
    }

    if (!this.entryFile) {
      this.entryFile = `index.${this.os}.js`;
      if (fileDoesNotExistOrIsDirectory(this.entryFile)) {
        this.entryFile = "index.js";
      }

      if (fileDoesNotExistOrIsDirectory(this.entryFile)) {
        return failure(ErrorCodes.NotFound, `Entry file "index.${this.os}.js" or "index.js" does not exist.`);
      }
    } else {
      if (fileDoesNotExistOrIsDirectory(this.entryFile)) {
        return failure(ErrorCodes.NotFound, `Entry file "${this.entryFile}" does not exist.`);
      }
    }

    if (this.outputDir) {
      this.sourcemapOutput = path.join(this.updateContentsPath, this.bundleName + ".map");
    }

    this.targetBinaryVersion = this.specifiedTargetBinaryVersion;

    if (this.targetBinaryVersion && !isValidRange(this.targetBinaryVersion)) {
      return failure(ErrorCodes.InvalidParameter, "Invalid binary version(s) for a release.");
    } else if (!this.targetBinaryVersion) {
      const versionSearchParams: VersionSearchParams = {
        os: this.os,
        plistFile: this.plistFile,
        plistFilePrefix: this.plistFilePrefix,
        gradleFile: this.gradleFile
      } as VersionSearchParams;
      this.targetBinaryVersion = await getReactNativeProjectAppVersion(versionSearchParams);
    }

    try {
      createEmptyTmpReleaseFolder(this.updateContentsPath);
      removeReactTmpDir();
      await runReactNativeBundleCommand(this.bundleName, this.development, this.entryFile, this.updateContentsPath, this.os, this.sourcemapOutput);

      out.text(chalk.cyan("\nReleasing update contents to CodePush:\n"));

      return await this.release(client);
    } catch (error) {
      debug(`Failed to release a CodePush update - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "Failed to release a CodePush update.")
    } finally {
      if (!this.outputDir) {
        await pfs.rmDir(this.updateContentsPath);
      }
    }
  }
}
