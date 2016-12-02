import { CommandArgs, help, success, name, shortName, longName, required, hasArg,
         ErrorCodes } from "../../../util/commandLine";
import { EspressoPreparer } from "../lib/espresso-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { out } from "../../../util/interaction";
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

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(): Promise<string> {
    let preparer = new EspressoPreparer(this.artifactsDir, this.buildDir, this.testApkPath);
    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.buildDir;
  }
}