import * as iba from "../../../util/misc/ios-bundle-archiver";
import * as path from "path";
import * as pfs from "../../../util/misc/promisfied-fs";
import { CommandArgs, help, longName, hasArg, required } from "../../../util/commandline";
import { Messages } from "../lib/help-messages";
import { RunTestsCommand } from "../lib/run-tests-command";
import { TestCloudError } from "../lib/test-cloud-error";
import { XCUITestPreparer } from "../lib/xcuitest-preparer";

@help(Messages.TestCloud.Commands.RunXCUITest)
export default class RunXCUITestCommand extends RunTestsCommand {

  @help(Messages.TestCloud.Arguments.XCUITestBuildDir)
  @longName("build-dir")
  @hasArg
  buildDir: string;

  @help(Messages.TestCloud.Arguments.XCUITestIpaPath)
  @longName("test-ipa-path")
  @hasArg
  testIpaPath: string;

  protected isAppPathRquired = false;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    let preparer = new XCUITestPreparer(artifactsDir, this.buildDir, this.testIpaPath);
    return preparer.prepare();
  }

  protected async validateOptions(): Promise<void> {
    if (this.buildDir) {
      if (this.appPath && this.testIpaPath) {
        throw Error("--build-dir cannot be used when both --app-path and --test-ipa-path are used");
      }
      if (!this.appPath) {
        await this.generateAppIpa();
      }
    } else {
      if (!this.appPath) {
        throw Error("either --app-path or --build-dir is required");
      }
      if (!this.testIpaPath) {
        throw Error("either --test-ipa-path or --build-dir is required");
      }
    }
  }

  protected getSourceRootDir(): string {
    return this.buildDir;
  }

  private async generateAppIpa(): Promise<void> {
    let appPaths = (await pfs.readdir(this.buildDir)).filter((appPath) => {
      if (appPath.endsWith("-Runner.app")) {
        return false;
      }
      return appPath.endsWith(".app");
    });
    if (appPaths.length == 0) {
      throw new TestCloudError(`Unable to find app within ${this.buildDir}`);
    }
    if (appPaths.length > 1) {
      throw new TestCloudError(`Multiple apps found within ${this.buildDir}`);
    }

    this.appPath = path.join((await this.getArtifactsDir()), `${path.parse(appPaths[0]).name}.ipa`);

    await iba.archiveAppBundle(path.join(this.buildDir, appPaths[0]), this.appPath);
  }
}