import { CommandArgs, help, longName, hasArg } from "../../../util/commandline";
import { RunTestsCommand } from "../lib/run-tests-command";
import { EspressoPreparer } from "../lib/espresso-preparer";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.RunEspresso)
export default class RunEspressoTestsCommand extends RunTestsCommand {

  @help(Messages.TestCloud.Arguments.EspressoBuildDir)
  @longName("build-dir")
  @hasArg
  buildDir: string;

  @help(Messages.TestCloud.Arguments.EspressoTestApkPath)
  @longName("test-apk-path")
  @hasArg
  testApkPath: string;

  @help(Messages.TestCloud.Arguments.NotSupported + " for Espresso")
  @longName("include")
  @hasArg
  include: string[];

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    if (!this.appPath) {
      throw new Error("Argument --app-path is required");
    }
    const preparer = new EspressoPreparer(artifactsDir, this.buildDir, this.testApkPath, this.include);
    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.buildDir;
  }
}
