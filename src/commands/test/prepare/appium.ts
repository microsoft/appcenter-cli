import { CommandArgs, help, success, name, longName, required, hasArg,
         ErrorCodes } from "../../../util/commandLine";
import { AppiumPreparer } from "../lib/appium-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { out } from "../../../util/interaction";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.PrepareAppium)
export default class PrepareAppiumCommand extends PrepareTestsCommand {
  @help(Messages.TestCloud.Arguments.AppiumBuildDir)
  @longName("build-dir")
  @hasArg
  @required
  buildDir: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(): Promise<string> {
    let preparer = new AppiumPreparer(this.artifactsDir, this.buildDir);
    return preparer.prepare();
  }
}