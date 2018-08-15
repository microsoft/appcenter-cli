import { CommandArgs, help, longName, hasArg } from "../../../util/commandline";
import { XCUITestPreparer } from "../lib/xcuitest-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.PrepareXCUITest)
export default class PrepareXCUITestCommand extends PrepareTestsCommand {

  @help(Messages.TestCloud.Arguments.XCUITestBuildDir)
  @longName("build-dir")
  @hasArg
  buildDir: string;

  @help(Messages.TestCloud.Arguments.XCUITestIpaPath)
  @longName("test-ipa-path")
  @hasArg
  testIpaPath: string;

  @help(Messages.TestCloud.Arguments.NotSupported + " for XCUITest")
  @longName("include")
  @hasArg
  include: string[];

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(): Promise<string> {
    const preparer = new XCUITestPreparer(this.artifactsDir, this.buildDir, this.testIpaPath, this.include);
    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.buildDir;
  }

  protected async validateOptions(): Promise<void> {
    if (this.buildDir && this.testIpaPath) {
      throw Error("--build-dir cannot be used with --test-ipa-path");
    }
    if (!(this.buildDir || this.testIpaPath)) {
      throw Error("--build-dir or --test-ipa-path is required");
    }
  }
}
