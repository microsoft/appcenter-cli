import { CommandArgs, help, success, name, shortName, longName, required, hasArg,
         ErrorCodes } from "../../../util/commandLine";
import { UITestPreparer } from "../lib/uitest-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { out } from "../../../util/interaction";
import * as outExtensions from "../lib/interaction";
import * as process from "../../../util/misc/process-helper";

const debug = require("debug")("mobile-center-cli:commands:tests:prepare");

@help("Prepares UI Test artifacts for test run")
export default class PrepareUITestCommand extends PrepareTestsCommand {
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

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(): Promise<string> {
    let preparer = new UITestPreparer(this.artifactsDir, this.buildDir, this.appPath);

    preparer.storeFile = this.storeFile;
    preparer.storePassword = this.storePassword;
    preparer.keyAlias = this.keyAlias;
    preparer.keyPassword = this.keyPassword;
    preparer.uiTestToolsDir = this.uiTestToolsDir;

    return preparer.prepare();
  }
}
