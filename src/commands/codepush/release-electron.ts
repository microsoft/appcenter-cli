import { CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName, defaultValue } from "../../util/commandline";
import CodePushReleaseCommandBase from "./lib/codepush-release-command-base";
import { AppCenterClient, clientRequest, models } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as pfs from "../../util/misc/promisfied-fs";
import * as path from "path";
import * as mkdirp from "mkdirp";
import chalk from "chalk";
import { fileDoesNotExistOrIsDirectory, createEmptyTmpReleaseFolder } from "./lib/file-utils";
import { isValidRange, isValidDeployment } from "./lib/validation-utils";
import { getElectronProjectAppVersion, runWebPackBundleCommand, isValidOS, isElectronProject } from "./lib/electron-utils";

const debug = require("debug")("appcenter-cli:commands:codepush:release-electron");

@help("Release an Electron update to a deployment")
export default class CodePushReleaseElectronCommand extends CodePushReleaseCommandBase {
  @help("Name of the generated JS bundle file. If unspecified, the standard bundle name will be used 'index.electron.bundle'")
  @shortName("b")
  @longName("bundle-name")
  @hasArg
  public bundleName: string;

  @help("Specifies whether to generate a Development or Production build")
  @longName("development")
  public development: boolean;

  @help("Path to the webpack config file. If omitted, \"webpack.config.js\" will be used (if they exist)")
  @shortName("c")
  @longName("config")
  @hasArg
  public config: string;

  @help("Path to the app's entry Javascript file. If omitted, \"index.<platform>.js\" and then \"index.js\" will be used (if they exist)")
  @shortName("e")
  @longName("entry-file")
  @hasArg
  public entryFile: string;

  @help("Filename (including path) for the sourcemap of the resulting bundle. If 'sourcemap-output' and 'sourcemap-output-dir' are omitted, a sourcemap will not be generated")
  @shortName("s")
  @longName("sourcemap-output")
  @hasArg
  public sourcemapOutput: string;

  @help("Path to directory where the sourcemap for the resulting bundle should be written. Name of sourcemap file will be generated automatically. This argument will be ignored if 'sourcemap-output' argument is provided. If 'sourcemap-output' and 'sourcemap-output-dir' are omitted, a sourcemap will not be generated")
  @longName("sourcemap-output-dir")
  @hasArg
  public sourcemapOutputDir: string;

  @help("Output path for the bundle and sourcemap. If omitted, a bundle and sourcemap will not be generated")
  @shortName("o")
  @longName("output-dir")
  @hasArg
  public outputDir: string;

  @help("Semver expression that specifies the binary app version(s) this release is targeting (e.g. 1.1.0, ~1.2.3)")
  @shortName("t")
  @longName("target-binary-version")
  @hasArg
  public specifiedTargetBinaryVersion: string;

  @help("Option that gets passed to webpack bundler. Can be specified multiple times")
  @longName("extra-bundler-option")
  @defaultValue([])
  @hasArg
  public extraBundlerOptions: string | string[];

  private os: string;

  private mode: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
      if (!isElectronProject()) {
          return failure(ErrorCodes.InvalidParameter, `The project in the CWD is not a Electron project.`);
      }

      if (!(await isValidDeployment(client, this.app, this.specifiedDeploymentName))) {
          return failure(ErrorCodes.InvalidParameter, `Deployment "${this.specifiedDeploymentName}" does not exist.`);
      } else {
          this.deploymentName = this.specifiedDeploymentName;
      }

      const appInfo = (await out.progress("Getting app info...", clientRequest<models.AppResponse>(
          (cb) => client.apps.get(this.app.ownerName, this.app.appName, cb)))).result;
      this.os = appInfo.os.toLowerCase();

      this.updateContentsPath = this.outputDir || await pfs.mkTempDir("code-push");

      // we have to add "CodePush" root folder to make update contents file structure
      // to be compatible with Electron-CodePush client SDK
      this.updateContentsPath = path.join(this.updateContentsPath, "CodePush");
      mkdirp.sync(this.updateContentsPath);

      if (!isValidOS(this.os)) {
        return failure(ErrorCodes.InvalidParameter, `OS must be "linux", "macos" or "windows".`);
      }

      if (!this.bundleName) {
        this.bundleName = `index.electron.bundle`;
      }

      this.mode = this.development ? "development" : "production";

      if (!this.config) {
        if (!fileDoesNotExistOrIsDirectory("webpack.config.js")) {
            this.config = "webpack.config.js";
        }
      } else {
        if (fileDoesNotExistOrIsDirectory(this.config)) {
            return failure(ErrorCodes.NotFound, `WebPack Config file "${this.config}" does not exist.`);
        }
      }

      if (!this.entryFile) {
        this.entryFile = `index.${this.os}.js`;
        if (fileDoesNotExistOrIsDirectory(this.entryFile)) {
            this.entryFile = `index.js`;
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
          this.targetBinaryVersion = await getElectronProjectAppVersion();
      }

      if (typeof this.extraBundlerOptions === "string") {
          this.extraBundlerOptions = [this.extraBundlerOptions];
      }

      try {
          createEmptyTmpReleaseFolder(this.updateContentsPath);
          await runWebPackBundleCommand(this.bundleName, this.mode, this.config, this.entryFile, this.updateContentsPath, this.sourcemapOutput, this.extraBundlerOptions);

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
