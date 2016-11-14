import { Command, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn, ErrorCodes } from "../../../util/commandLine";
import { CalabashPreparer } from "../lib/calabash-preparer";
import { out } from "../../../util/interaction";
import * as outExtensions from "../lib/interaction";
import * as process from "../../../util/misc/process-helper";

const debug = require("debug")("mobile-center:commands:test");

@help("Prepares Calabash artifacts for test run")
export default class PrepareCalabashCommand extends Command {
  @help("Path to an application file")
  @longName("app-path")
  @required
  @hasArg
  appPath: string;

  @help("Path to workspace")
  @longName("workspace")
  @required
  @hasArg
  workspace: string;

  @help("Path to output directory with all test artifacts")
  @longName("artifacts-dir")
  @required
  @hasArg
  artifactsDir: string;

  @help("Use Signing Info for signing the test server")
  @longName("sign-info")
  @hasArg
  signInfo: string;

  @help("Additional files / directories that should be included in the test run. The value should be in format 'sourceDir=targetDir'")
  @longName("include")
  @hasArg
  include: string[];

  @help("Additional test parameters that should be included in the test run. The value should be in format key=value")
  @longName("test-parameter")
  @shortName("p")
  @hasArg
  testParameters: string[];

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
    
    if (!this.testParameters) {
      this.testParameters = [];
    }
    else if (typeof this.testParameters === "string") {
      this.testParameters = [ this.testParameters ];
    }

    if (!this.include) {
      this.include = [];
    }
    else if (typeof this.include === "string") {
      this.include = [ this.include ];
    }
  }

  public async runNoClient(): Promise<CommandResult> {
    try {
      let preparer = new CalabashPreparer(this.artifactsDir, this.workspace, this.appPath);

      preparer.signInfo = this.signInfo;
      preparer.config = this.config;
      preparer.profile = this.profile;
      preparer.skipConfigCheck = this.skipConfigCheck;
      preparer.include = this.include;
      preparer.testParameters = this.testParameters;

      let manifestPath = await preparer.prepare();
      out.text(`Calabash tests are ready to run. Manifest file was written to ${manifestPath}.`);
      
      return success();
    }
    catch (err) {
      let exitCode = err.exitCode || ErrorCodes.Exception;
      return failure(exitCode, err.message);
    }
  }
}
