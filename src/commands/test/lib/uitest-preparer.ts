import { TestCloudError } from "./test-cloud-error";
import * as _ from "lodash";
import * as glob from "glob";
import * as os from "os";
import * as path from "path";
import * as process from "../../../util/misc/process-helper";

const debug = require("debug")("mobile-center-cli:commands:test:lib:uitest-preparer");
const minimumVersion = [2, 0, 1];

export class UITestPreparer {
  private readonly appPath: string;
  private readonly assemblyDir: string;
  private readonly artifactsDir: string;

  public storeFile: string;
  public storePassword: string;
  public keyAlias: string;
  public keyPassword: string;
  public signInfo: string;
  public include: string[];
  public testParameters: string[];
  public uiTestToolsDir: string;

  constructor(artifactsDir: string, assemblyDir: string, appPath: string) {
    if (!artifactsDir) {
      throw new Error("Argument artifactsDir is required");
    }
    if (!assemblyDir) {
      throw new Error("Argument assemblyDir is required");
    }
    if (!appPath) {
      throw new Error("Argument appPath is required");
    }

    this.appPath = appPath;
    this.assemblyDir = assemblyDir;
    this.artifactsDir = artifactsDir;
  }

  public async prepare(): Promise<string> {
    this.validateArguments();

    let command = await this.getPrepareCommand();
    debug(`Executing command ${command}`);
    let exitCode = await process.execAndWait(command);

    if (exitCode !== 0) {
      throw new TestCloudError("Cannot prepare UI Test artifacts. Please inspect logs for more details", exitCode);
    }

    return path.join(this.artifactsDir, "manifest.json");
  }

  private validateArguments() {
    if (this.storeFile || this.storePassword || this.keyAlias || this.keyPassword) {
      if (!(this.storeFile && this.storePassword && this.keyAlias && this.keyPassword)) {
        throw new Error("If keystore is used, all of the following arguments must be set: --store-file, --store-password, --key-alias, --key-password");
      }
    }
  }

  private async getPrepareCommand(): Promise<string> {
    let command = "";
    if (os.platform() !== "win32") {
      command += `mono `;
    }

    let testCloudBinary = await this.getTestCloudExecutablePath();
    command += `${testCloudBinary} prepare "${this.appPath}"`;

    if (this.storeFile) {
      command += ` "${this.storeFile}" "${this.storePassword}" "${this.keyAlias}" "${this.keyPassword}"`;
    }

    command += ` --assembly-dir "${this.assemblyDir}" --artifacts-dir "${this.artifactsDir}"`;

    for (let i = 0; i < this.testParameters.length; i++) {
      command += ` --test-parameter "${this.testParameters[i]}"`;
    }

    for (let i = 0; i < this.include.length; i++) {
      command += ` --include "${this.include[i]}"`;
    }

    if (this.signInfo) {
      command += ` --sign-info "${this.signInfo}"`;
    }

    return command;
  }

  private async getTestCloudExecutablePath(): Promise<string> {
    let toolsDir = this.uiTestToolsDir || await this.findXamarinUITestNugetDir(this.assemblyDir);
    return path.join(toolsDir, "test-cloud.exe");
  }

  private async findXamarinUITestNugetDir(root: string): Promise<string> {
    let possibleNugetDirPattern = path.join(root, "packages", "Xamarin.UITest.*", "tools", "test-cloud.exe");
    let files = (await this.globAsync(possibleNugetDirPattern)).sort();

    if (files.length === 0) {
       let parentDir = path.dirname(root);

       if (parentDir === root) {
         throw new Error(`Cannot find test-cloud.exe, which is required to prepare UI tests.${os.EOL}` +
          `We have searched for directory "packages${path.sep}Xamarin.UITest.*${path.sep}tools" inside ` +
          `"${this.assemblyDir}" and all of its parent directories.${os.EOL}` +
          `Please use option "--uitest-tools-dir" to manually specify location of this tool.${os.EOL}` +
          `Minimum required version is "${this.getMinimumVersionString()}".`);
       }
       else {
         return await this.findXamarinUITestNugetDir(parentDir);
       }
    }
    else {
      let latestTestCloudPath = files[files.length - 1];
      let match = latestTestCloudPath.match(/Xamarin\.UITest\.(\d+)\.(\d+)\.(\d+)/);

      if (!match) {
        throw new Error(`Found test-cloud.exe at "${path.dirname(latestTestCloudPath)}", but cannot recognize its version.${os.EOL}` +
                        `Please use option "--uitest-tools-dir" to manually specify location of this tool.${os.EOL}` +
                        `Minimum required version is "${this.getMinimumVersionString()}".`);
      }

      let [, major, minor, build] = match;
      if (!this.hasMinimumTestCloudVersion(parseInt(major), parseInt(minor), parseInt(build))) {
        throw new Error(`The latest version of test-cloud.exe, found at "${path.dirname(latestTestCloudPath)}", ` +
                        `is too old.${os.EOL}` +
                        `Please upgrade the NuGet package to version ${this.getMinimumVersionString()} or higher.`);
      }
      else {
        return path.dirname(latestTestCloudPath);
      }
    }
  }

  private async globAsync(pattern: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      glob(pattern, (err, matches) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(matches);
        }
      });
    });
  }

  private getMinimumVersionString(): string {
    return `${minimumVersion[0]}.${minimumVersion[1]}.${minimumVersion[2]}`;
  }

  private hasMinimumTestCloudVersion(major: number, minor: number, build: number): boolean {
    let currentVersion = [major, minor, build];

    let minLength = Math.min(currentVersion.length, minimumVersion.length);

    for (let i = 0; i < minLength; i++) {
      if (currentVersion[i] < minimumVersion[i]) {
        return false;
      }
    }

    return true;
  }
}