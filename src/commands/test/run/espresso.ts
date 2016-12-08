import { CommandArgs, help, name, longName, hasArg, ErrorCodes, required } from "../../../util/commandline";
import { RunTestsCommand } from "../lib/run-tests-command";
import { EspressoPreparer } from "../lib/espresso-preparer";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.RunEspresso)
export default class RunEspressoTestsCommand extends RunTestsCommand {

  @help(Messages.TestCloud.Arguments.AppPath)
  @longName("app-path")
  @required
  @hasArg
  appPath: string;

  @help(Messages.TestCloud.Arguments.EspressoBuildDir)
  @longName("build-dir")
  @hasArg
  buildDir: string;

  @help(Messages.TestCloud.Arguments.EspressoTestApkPath)
  @longName("test-apk-path")
  @hasArg
  testApkPath: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    if (!this.appPath) {
      throw new Error("Argument --app-path is required");
    }
    let preparer = new EspressoPreparer(artifactsDir, this.buildDir, this.testApkPath);
    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.buildDir;
  }
}