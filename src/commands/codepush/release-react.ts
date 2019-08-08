import { CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName, defaultValue } from "../../util/commandline";
import CodePushReleaseCommandBase from "./lib/codepush-release-command-base";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as pfs from "../../util/misc/promisfied-fs";
import chalk from "chalk";
import * as path from "path";
import * as mkdirp from "mkdirp";
import { fileDoesNotExistOrIsDirectory, createEmptyTmpReleaseFolder, removeReactTmpDir } from "./lib/file-utils";
import { isValidRange, isValidDeployment } from "./lib/validation-utils";
import { VersionSearchParams, getReactNativeProjectAppVersion, runReactNativeBundleCommand, runHermesEmitBinaryCommand, getHermesEnabled, isValidOS, isValidPlatform, isReactNativeProject } from "./lib/react-native-utils";

const debug = require("debug")("appcenter-cli:commands:codepush:release-react");

@help("Release a React Native update to an app deployment")
export default class CodePushReleaseReactCommand extends CodePushReleaseCommandBase {
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
  @hasArg
  public sourcemapOutput: string;

  @help("Path to folder where the sourcemap for the resulting bundle should be written. Name of sourcemap file will be generated automatically. This argument will be ignored if \"sourcemap-output\" argument is provided. If omitted, a sourcemap will not be generated")
  @longName("sourcemap-output-dir")
  @hasArg
  public sourcemapOutputDir: string;

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

  @help("Option that gets passed to react-native bundler. Can be specified multiple times")
  @longName("extra-bundler-option")
  @defaultValue([])
  @hasArg
  public extraBundlerOptions: string | string[];

  @help("Flag that gets passed to Hermes, JavaScript to bytecode compiler. Can be specified multiple times")
  @longName("extra-hermes-flag")
  @defaultValue([])
  @hasArg
  public extraHermesFlags: string | string[];

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
      (cb) => client.apps.get(this.app.ownerName, this.app.appName, cb)))).result;
    this.os = appInfo.os.toLowerCase();
    this.platform = appInfo.platform.toLowerCase();

    this.updateContentsPath = this.outputDir || await pfs.mkTempDir("code-push");

    // we have to add "CodePush" root folder to make update contents file structure
    // to be compatible with React Native client SDK
    this.updateContentsPath = path.join(this.updateContentsPath, "CodePush");
    mkdirp.sync(this.updateContentsPath);

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

    if (this.sourcemapOutputDir && this.sourcemapOutput) {
      out.text(("\n\"sourcemap-output-dir\" argument will be ignored as \"sourcemap-output\" argument is provided.\n"));
    }

    if ((this.outputDir || this.sourcemapOutputDir) && !this.sourcemapOutput) {
      const sourcemapDir = this.sourcemapOutputDir || this.updateContentsPath;
      this.sourcemapOutput = path.join(sourcemapDir, this.bundleName + ".map");
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

    if (typeof this.extraBundlerOptions === "string") {
      this.extraBundlerOptions = [this.extraBundlerOptions];
    }

    if (typeof this.extraHermesFlags === "string") {
      this.extraHermesFlags = [this.extraHermesFlags];
    }

    try {
      createEmptyTmpReleaseFolder(this.updateContentsPath);
      removeReactTmpDir();
      await runReactNativeBundleCommand(this.bundleName, this.development, this.entryFile, this.updateContentsPath, this.os, this.sourcemapOutput, this.extraBundlerOptions);
      // Check if we have to run hermes to compile JS to Byte Code if Hermes is enabled in build.gradle and we're releasing an Android build
      if (this.os === "android") {
        const isHermesEnabled = await getHermesEnabled(this.gradleFile);
        if (isHermesEnabled) {
          await runHermesEmitBinaryCommand(this.bundleName, this.updateContentsPath, this.sourcemapOutput, this.extraHermesFlags);
        }
      }
      out.text(chalk.cyan("\nReleasing update contents to CodePush:\n"));

      return await this.release(client);
    } catch (error) {
      debug(`Failed to release a CodePush update - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "Failed to release a CodePush update.");
    } finally {
      if (!this.outputDir) {
        await pfs.rmDir(this.updateContentsPath);
      }
    }
  }
}
