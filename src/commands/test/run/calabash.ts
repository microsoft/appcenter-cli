import { CommandArgs, help, longName, hasArg, required } from "../../../util/commandline";
import { RunTestsCommand } from "../lib/run-tests-command";
import { CalabashPreparer } from "../lib/calabash-preparer";
import { Messages } from "../lib/help-messages";
import { out } from "../../../util/interaction";

@help(Messages.TestCloud.Commands.RunCalabash)
export default class RunCalabashTestsCommand extends RunTestsCommand {

  @help(Messages.TestCloud.Arguments.CalabashProjectDir)
  @longName("project-dir")
  @required
  @hasArg
  projectDir: string;

  @help("Obsolete. Please use --project-dir instead")
  @longName("workspace")
  @hasArg
  workspaceDir: string;

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

  protected async validateOptions(): Promise<void> {
    if (this.workspaceDir && !this.projectDir) {
      out.text("Argument --workspace is obsolete. Please use --project-dir instead.");
      this.projectDir = this.workspaceDir;
    }

    if (!this.projectDir) {
      throw new Error("Argument --project-dir is required");
    }
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    const preparer = new CalabashPreparer(artifactsDir, this.projectDir, this.appPath, this.testParameters);

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
