import { CommandArgs, help, name, longName, hasArg, ErrorCodes, required } from "../../../util/commandLine";
import { RunTestsCommand } from "../lib/run-tests-command";
import { CalabashPreparer } from "../lib/calabash-preparer";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.RunCalabash)
export default class RunCalabashTestsCommand extends RunTestsCommand {
  @help(Messages.TestCloud.Arguments.CalabashProjectDir)
  @longName("project-dir")
  @required
  @hasArg
  projectDir: string;

  @help(Messages.TestCloud.Arguments.CalabashSignInfo)
  @longName("sign-info")
  @hasArg
  signInfo: string;

  @help(Messages.TestCloud.Arguments.CalabashConfigPath)
  @longName("config-path")
  @hasArg
  config: string;

  @help(Messages.TestCloud.Arguments.CalabashProfile)
  @longName("profile")
  @hasArg
  profile: string;

  @help(Messages.TestCloud.Arguments.CalabashSkipConfigCheck)
  @longName("skip-config-check")
  skipConfigCheck: boolean;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    let preparer = new CalabashPreparer(artifactsDir, this.projectDir, this.appPath);

    preparer.signInfo = this.signInfo;
    preparer.config = this.config;
    preparer.profile = this.profile;
    preparer.skipConfigCheck = this.skipConfigCheck;

    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.projectDir;
  }
}