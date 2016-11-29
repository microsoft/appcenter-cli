import { Command, CommandArgs, CommandResult,
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn, ErrorCodes } from "../../../util/commandLine";
import { UITestPreparer } from "../lib/uitest-preparer";
import { out } from "../../../util/interaction";
import * as outExtensions from "../lib/interaction";
import * as process from "../../../util/misc/process-helper";

const debug = require("debug")("mobile-center-cli:commands:tests:prepare");

@help("Prepares UI Test artifacts for test run")
export default class PrepareUITestCommand extends Command {
  @help("Path to an application file")
  @longName("app-path")
  @required
  @hasArg
  appPath: string;

  @help("Path to directory with test assemblies")
  @longName("build-dir")
  @required
  @hasArg
  buildDir: string;

  @help("Path to output directory with all test artifacts")
  @longName("artifacts-dir")
  @required
  @hasArg
  artifactsDir: string;

  @help("TODO")
  @longName("store-file")
  @hasArg
  storeFile: string;

  @help("TODO")
  @longName("store-password")
  @hasArg
  storePassword: string;

  @help("TODO")
  @longName("key-alias")
  @hasArg
  keyAlias: string;

  @help("TODO")
  @longName("key-password")
  @hasArg
  keyPassword: string;

  @help("Use Signing Info for signing the test server")
  @longName("sign-info")
  @hasArg
  signInfo: string;

  @help("Path to Xamarin UITest tools directory that contains test-cloud.exe")
  @longName("uitest-tools-dir")
  @hasArg
  uiTestToolsDir: string;

  @help("Additional files / directories that should be included in the test run. The value should be in format 'sourceDir=targetDir'")
  @longName("include")
  @hasArg
  include: string[];

  @help("Additional test parameters that should be included in the test run. The value should be in format key=value")
  @longName("test-parameter")
  @shortName("p")
  @hasArg
  testParameters: string[];

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
      let preparer = new UITestPreparer(this.artifactsDir, this.buildDir, this.appPath);

      preparer.storeFile = this.storeFile;
      preparer.storePassword = this.storePassword;
      preparer.keyAlias = this.keyAlias;
      preparer.keyPassword = this.keyPassword;
      preparer.include = this.include;
      preparer.testParameters = this.testParameters;
      preparer.uiTestToolsDir = this.uiTestToolsDir;

      let manifestPath = await preparer.prepare();
      out.text(`UI Tests are ready to run. Manifest file was written to ${manifestPath}.`);

      return success();
    }
    catch (err) {
      let exitCode = err.exitCode || ErrorCodes.Exception;
      return failure(exitCode, err.message);
    }
  }
}
