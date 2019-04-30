import { TestCloudError } from "./test-cloud-error";
import { glob } from "../../../util/misc/promisfied-glob";
import { directoryExists, fileExists } from "../../../util/misc/promisfied-fs";
import * as _ from "lodash";
import * as os from "os";
import * as path from "path";
import * as process from "../../../util/misc/process-helper";
import { out } from "../../../util/interaction";

const debug = require("debug")("appcenter-cli:commands:test:lib:uitest-preparer");
const minimumVersion = [2, 2, 0];

export class UITestPreparer {
  private readonly appPath: string;
  private readonly buildDir: string;
  private readonly artifactsDir: string;

  public storeFile: string;
  public storePassword: string;
  public keyAlias: string;
  public keyPassword: string;
  public signInfo: string;
  public uiTestToolsDir: string;
  public fixture: string[];
  public includeCategory: string[];
  public excludeCategory: string[];
  public nunitXml: string;
  public testChunk: boolean;
  public fixtureChunk: boolean;

  constructor(artifactsDir: string, buildDir: string, appPath: string) {
    if (!artifactsDir) {
      throw new Error("Argument --artifacts-dir is required");
    }
    if (!buildDir) {
      throw new Error("Argument --build-dir is required");
    }
    if (!appPath) {
      throw new Error("Argument --app-path is required");
    }

    this.appPath = appPath;
    this.buildDir = buildDir;
    this.artifactsDir = artifactsDir;
  }

  public async prepare(): Promise<string> {
    this.validateArguments();

    const command = await this.getPrepareCommand();
    debug(`Executing command ${command}`);
    const exitCode = await process.execAndWait(command, this.outMessage, this.outMessage);

    if (exitCode !== 0) {
      const message = this.convertErrorCode(exitCode);
      throw new TestCloudError(`Cannot prepare UI Test artifacts using command: ${command}.${os.EOL}${os.EOL}${message}`, exitCode);
    }

    return path.join(this.artifactsDir, "manifest.json");
  }

  private convertErrorCode(exitCode: number): string {
    const tryAgain = `, please try again. If you can't work out how to fix this issue, please contact support.`;

    switch (exitCode) {
      case 1:
        return `There was an unknown error preparing test artifacts${tryAgain}`;
      case 2:
        return `Invalid options were used to prepare the test artifacts${tryAgain}`;
      case 3:
        return `The app file was not found${tryAgain}`;
      case 4:
        return `The assembly directory was not found${tryAgain}`;
      case 5:
        return `The NUnit library was not found${tryAgain}`;
      case 6:
        return `The UITest.dll was not found${tryAgain}`;
      case 7:
        return `No test assemblies were found${tryAgain}`;
      case 8:
        return `The Sign Info File was not found${tryAgain}`;
      case 9:
        return `The KeyStore was not found${tryAgain}`;
      case 10:
        return `The dSym was not found or was not a directory${tryAgain}`;
      case 11:
        return `The dSym directory has the wrong extension${tryAgain}`;
      case 12:
        return `The dSym file contains more than one dwarf${tryAgain}`;
      case 13:
        return `Test chunking failed${tryAgain}`;
      case 14:
        return `Upload negotiation failed${tryAgain}`;
      case 15:
        return `The upload failed${tryAgain}`;
      case 16:
        return `Job status retrival failed while preparing test artifacts${tryAgain}`;
      case 17:
        return `The NUnit report was not returned${tryAgain}`;
      case 18:
        return `The job failed while preparing test artifacts${tryAgain}`;
      case 19:
        return `There were test failures.`;
      case 20:
        return `The version of UITest.dll and the tools are incompatible. ` +
          `Please make sure --uitest-tools-dir points to the same version of UITest as the dll in your assembly directory.`;
      case 21:
        return `No tests would run given the current parameters${tryAgain}`;
      case 22:
        return `A specified data file was outside the assembly directory. ` +
          `Please make sure all referenced data files exist within your assembly directory and try again.`;
      case 23:
        return `A specified data file was not found, please check your data files exist and try again. ` +
        `If this error happens again, please contact support.`;
      case 24:
        return `The test run did not pass validation${tryAgain}`;
      case 25:
        return `The test run was cancelled.`;
      case 26:
        return `The referenced version of NUnit was unsupported, please use NUnit 2.6.4 or below.`;
      case 27:
        return `The artifacts directory was invalid${tryAgain}`;
    }

    return `Returning exit code ${exitCode}.`;
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

    const testCloudBinary = await this.getTestCloudExecutablePath();
    command += `${testCloudBinary} prepare "${this.appPath}"`;

    if (this.storeFile) {
      command += ` keystore "${this.storeFile}" "${this.storePassword}" "${this.keyAlias}" "${this.keyPassword}"`;
    }

    command += ` --assembly-dir "${this.buildDir}" --artifacts-dir "${this.artifactsDir}"`;

    if (this.signInfo) {
      command += ` --sign-info "${this.signInfo}"`;
    }

    if (this.fixture) {
      this.fixture.forEach((item) => {
        command += ` --fixture "${item}"`;
      });
    }

    if (this.includeCategory) {
      this.includeCategory.forEach((category) => {
        command += ` --include "${category}"`;
      });
    }

    if (this.excludeCategory) {
      this.excludeCategory.forEach((category) => {
        command += ` --exclude "${category}"`;
      });
    }

    if (this.testChunk) {
      command += ` --test-chunk`;
    }

    if (this.fixtureChunk) {
      command += ` --fixture-chunk`;
    }

    return command;
  }

  private async getTestCloudExecutablePath(): Promise<string> {
    const toolsDir = this.uiTestToolsDir || await UITestPreparer.findXamarinUITestNugetDir(this.buildDir);

    if (!await directoryExists(toolsDir)) {
      throw new Error(`Cannot find test-cloud.exe, the path specified by "--uitest-tools-dir" was not found.${os.EOL}` +
        `Please check that "${toolsDir}" is a valid directory and contains test-cloud.exe.${os.EOL}` +
        `Minimum required version is "${UITestPreparer.getMinimumVersionString()}".`);
    }

    let testCloudPath = path.join(toolsDir, "test-cloud.exe");

    if (!await fileExists(testCloudPath)) {
      testCloudPath = path.join(toolsDir, "Xamarin.UITest.CLI.exe");
      if (!await fileExists(testCloudPath)) {
        throw new Error(`Cannot find test-cloud.exe, the exe was not found in the path specified by "--uitest-tools-dir".${os.EOL}` +
          `Please check that ${testCloudPath} points to a test-cloud.exe.${os.EOL}` +
          `Minimum required version is "${UITestPreparer.getMinimumVersionString()}".`);
      }
    }

    if (testCloudPath.includes(" ")) {
      testCloudPath = `"${testCloudPath}"`;
    }

    debug(`Using test cloud tools path: ${testCloudPath}`);

    return testCloudPath;
  }

  public static async findXamarinUITestNugetDir(root: string, buildDir?: string): Promise<string> {
    const possibleNugetDirPattern = path.join(root, "packages", "Xamarin.UITest.*", "tools", "test-cloud.exe");
    const files = (await glob(possibleNugetDirPattern)).sort();

    if (files.length === 0) {
       const parentDir = path.dirname(root);

       if (parentDir === root) {
         throw new Error(`Cannot find test-cloud.exe, which is required to prepare UI tests.${os.EOL}` +
          `We have searched for directory "packages${path.sep}Xamarin.UITest.*${path.sep}tools" inside ` +
          `"${buildDir || parentDir}" and all of its parent directories.${os.EOL}` +
          `Please use option "--uitest-tools-dir" to manually specify location of this tool.${os.EOL}` +
          `Minimum required version is "${this.getMinimumVersionString()}".`);
       } else {
         return await UITestPreparer.findXamarinUITestNugetDir(parentDir, buildDir);
       }
    } else {
      const latestTestCloudPath = files[files.length - 1];
      const match = latestTestCloudPath.match(/Xamarin\.UITest\.(\d+)\.(\d+)\.(\d+)/);

      if (!match) {
        throw new Error(`Found test-cloud.exe at "${path.dirname(latestTestCloudPath)}", but cannot recognize its version.${os.EOL}` +
          `Please use option "--uitest-tools-dir" to manually specify location of this tool.${os.EOL}` +
          `Minimum required version is "${this.getMinimumVersionString()}".`);
      }

      const [, major, minor, build] = match;
      if (!this.hasMinimumTestCloudVersion(parseInt(major, 10), parseInt(minor, 10), parseInt(build, 10))) {
        throw new Error(`The latest version of test-cloud.exe, found at "${path.dirname(latestTestCloudPath)}", ` +
          `is too old.${os.EOL}` +
          `Please upgrade the NuGet package to version ${this.getMinimumVersionString()} or higher.`);
      } else {
        return path.dirname(latestTestCloudPath);
      }
    }
  }

  private static getMinimumVersionString(): string {
    return `${minimumVersion[0]}.${minimumVersion[1]}.${minimumVersion[2]}`;
  }

  private static hasMinimumTestCloudVersion(major: number, minor: number, build: number): boolean {
    const currentVersion = [major, minor, build];

    const minLength = Math.min(currentVersion.length, minimumVersion.length);

    for (let i = 0; i < minLength; i++) {
      if (currentVersion[i] > minimumVersion[i]) {
        return true;
      }

      if (currentVersion[i] < minimumVersion[i]) {
        return false;
      }
    }

    return true;
  }

  /*
    the UITest preparer sometimes prints messages with it's own executable name, such as
    "Run 'test-cloud.exe help prepare' for more details". It's confusing for end users,
    so wer are removing lines that contain the executable name.
  */
  private outMessage(line: string) {
    if (line.indexOf("test-cloud.exe") === -1) {
      out.text(line);
    }
  }
}
