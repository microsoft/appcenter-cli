import { CommandArgs, help, success, name, longName, required, hasArg,
         ErrorCodes } from "../../../util/commandline";
import { CalabashPreparer } from "../lib/calabash-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { out } from "../../../util/interaction";
import * as outExtensions from "../lib/interaction";
import * as process from "../../../util/misc/process-helper";
import { Messages } from "../lib/help-messages";

const debug = require("debug")("mobile-center-cli:commands:test:prepare:calabash");

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

  @help(Messages.TestCloud.Arguments.CalabashConfigPath)
  @longName("config")
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

  protected async runNoClientInner(): Promise<void> {
    if (this.workspaceDir && !this.projectDir) {
      out.text("Argument --workspace is obsolete. Please use --project-dir instead.");
      this.projectDir = this.workspaceDir;
    }

    if (!this.projectDir) {
      throw new Error("Argument --project-dir is required");
    }
  }

  protected prepareManifest(): Promise<string> {
    let preparer = new CalabashPreparer(this.artifactsDir, this.projectDir, this.appPath);

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
