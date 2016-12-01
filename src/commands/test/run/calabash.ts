import { CommandArgs, help, name, longName, hasArg, ErrorCodes, required } from "../../../util/commandLine";
import { RunTestsCommand } from "../lib/run-tests-command";
import { CalabashPreparer } from "../lib/calabash-preparer";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";

@help("Prepares and runs Calabash tests")
export default class RunCalabashTestsCommand extends RunTestsCommand {
  @help("Path to workspace")
  @longName("workspace")
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