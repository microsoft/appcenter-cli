import { CommandArgs, help, success, name, longName, required, hasArg,
         ErrorCodes } from "../../../util/commandLine";
import { CalabashPreparer } from "../lib/calabash-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { out } from "../../../util/interaction";
import * as outExtensions from "../lib/interaction";
import * as process from "../../../util/misc/process-helper";

const debug = require("debug")("mobile-center-cli:commands:test:prepare:calabash");

@help("Prepares Calabash artifacts for test run")
export default class PrepareCalabashCommand extends PrepareTestsCommand {
  @help("Path to an application file")
  @longName("app-path")
  @required
  @hasArg
  appPath: string;

  @help("Path to workspace")
  @longName("project-dir")
  @required
  @hasArg
  projectDir: string;

  @help("Use Signing Info for signing the test server")
  @longName("sign-info")
  @hasArg
  signInfo: string;

  @help("Path to Cucumber configuration. Can be relative to workspace")
  @longName("config")
  @hasArg
  config: string;

  @help("TODO")
  @longName("profile")
  @hasArg
  profile: string;

  @help("TODO")
  @longName("skip-config-check")
  skipConfigCheck: boolean;

  constructor(args: CommandArgs) {
    super(args);
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
