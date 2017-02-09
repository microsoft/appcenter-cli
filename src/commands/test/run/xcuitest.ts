import { CommandArgs, help, longName, hasArg, required } from "../../../util/commandline";
import { RunTestsCommand } from "../lib/run-tests-command";
import { XCUITestPreparer } from "../lib/xcuitest-preparer";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.RunXCUITest)
export default class RunXCUITestCommand extends RunTestsCommand {

  @help(Messages.TestCloud.Arguments.AppPath)
  @longName("app-path")
  @required
  @hasArg
  appPath: string;

  @help(Messages.TestCloud.Arguments.XCUITestIpaPath)
  @longName("test-ipa-path")
  @hasArg
  testApkPath: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    if (!this.appPath) {
      throw new Error("Argument --app-path is required");
    }
    let preparer = new XCUITestPreparer(artifactsDir, this.testApkPath);
    return preparer.prepare();
  }
}