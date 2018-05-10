import { CommandArgs, help, longName, required, hasArg } from "../../../util/commandline";
import { CalabashPreparer } from "../lib/calabash-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { out } from "../../../util/interaction";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.PrepareCalabash)
export default class PrepareCalabashCommand extends PrepareTestsCommand {
  @help(Messages.TestCloud.Arguments.AppPath)
  @longName("app-path")
  @required
  @hasArg
  appPath: string;

  @help(Messages.TestCloud.Arguments.CalabashProjectDir)
  @longName("project-dir")
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

  @help("Obsolete. Please use --config-path instead")
  @longName("config")
  @hasArg
  config: string;

  @help(Messages.TestCloud.Arguments.CalabashConfigPath)
  @longName("config-path")
  @hasArg
  configPath: string;

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

    if (this.config && this.configPath) {
      throw new Error("Arguments --config-path and --config (obsolete) were both used. Please use only --config-path.");
    }

    if (this.config) {
      out.text("Argument --config is obsolete. Please use --config-path instead.");
      this.configPath = this.config;
    }

    if (!this.projectDir) {
      throw new Error("Argument --project-dir is required");
    }
  }

  protected prepareManifest(): Promise<string> {
    const preparer = new CalabashPreparer(this.artifactsDir, this.projectDir, this.appPath, this.testParameters);

    preparer.signInfo = this.signInfo;
    preparer.config = this.configPath;
    preparer.profile = this.profile;
    preparer.skipConfigCheck = this.skipConfigCheck;

    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.projectDir;
  }
}
