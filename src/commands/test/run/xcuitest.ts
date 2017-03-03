import { CommandArgs, help, longName, hasArg, required } from "../../../util/commandline";
import { RunTestsCommand } from "../lib/run-tests-command";
import { XCUITestPreparer } from "../lib/xcuitest-preparer";
import { Messages } from "../lib/help-messages";

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
    } else {
      if (!this.appPath) {
        throw Error("either --app-path or --build-dir is required");
      }
      if (!this.testIpaPath) {
        throw Error("either --test-ipa-path or --build-dir is required");
      }
    }
  }

  protected getSourceRootDir() {
    return this.buildDir;
  }
}