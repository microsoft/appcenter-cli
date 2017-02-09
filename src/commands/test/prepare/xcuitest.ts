import { CommandArgs, help, longName, required, hasArg } from "../../../util/commandline";
import { XCUITestPreparer } from "../lib/xcuitest-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.PrepareXCUITest)
export default class PrepareXCUITestCommand extends PrepareTestsCommand {
  @help(Messages.TestCloud.Arguments.XCUITestIpaPath)
  @longName("test-ipa-path")
  @required
  @hasArg
  testIpaPath: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(): Promise<string> {
    let preparer = new XCUITestPreparer(this.artifactsDir, this.testIpaPath);
    return preparer.prepare();
  }
}