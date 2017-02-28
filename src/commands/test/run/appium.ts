import { CommandArgs, help, name, longName, hasArg, required, ErrorCodes } from "../../../util/commandline";
import { RunTestsCommand } from "../lib/run-tests-command";
import { AppiumPreparer } from "../lib/appium-preparer";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.RunAppium)
export default class RunAppiumTestsCommand extends RunTestsCommand {

  @help(Messages.TestCloud.Arguments.AppPath)
  @longName("app-path")
  @hasArg
  @required
  appPath: string;

  @help(Messages.TestCloud.Arguments.AppiumBuildDir)
  @longName("build-dir")
  @hasArg
  @required
  buildDir: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    let preparer = new AppiumPreparer(artifactsDir, this.buildDir);
    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.buildDir;
  }

  protected getAppPath()
  {
    return this.appPath;
  }
}