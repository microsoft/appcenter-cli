import { CommandArgs, help, longName, hasArg } from "../../../util/commandline";
import { EspressoPreparer } from "../lib/espresso-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.PrepareEspresso)
export default class PrepareEspressoCommand extends PrepareTestsCommand {
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

  protected prepareManifest(): Promise<string> {
    const preparer = new EspressoPreparer(this.artifactsDir, this.buildDir, this.testApkPath, this.include);
    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.buildDir;
  }
}
