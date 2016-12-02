import { CommandArgs, help, success, name, shortName, longName, required, hasArg,
         ErrorCodes } from "../../../util/commandLine";
import { UITestPreparer } from "../lib/uitest-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { out } from "../../../util/interaction";
import * as outExtensions from "../lib/interaction";
import * as process from "../../../util/misc/process-helper";
import { Messages } from "../lib/help-messages";

const debug = require("debug")("mobile-center-cli:commands:tests:prepare");

@help(Messages.TestCloud.Commands.PrepareUITests)
export default class PrepareUITestCommand extends PrepareTestsCommand {
  @help(Messages.TestCloud.Arguments.AppPath)
  @longName("app-path")
  @required
  @hasArg
  appPath: string;

  @help(Messages.TestCloud.Arguments.UITestsBuildDir)
  @longName("build-dir")
  @required
  @hasArg
  buildDir: string;

  @help(Messages.TestCloud.Arguments.UITestsStoreFilePath)
  @longName("store-path")
  @hasArg
  storePath: string;

  @help(Messages.TestCloud.Arguments.UITestsStorePassword)
  @longName("store-password")
  @hasArg
  storePassword: string;

  @help(Messages.TestCloud.Arguments.UITestsKeyAlias)
  @longName("key-alias")
  @hasArg
  keyAlias: string;

  @help(Messages.TestCloud.Arguments.UITestsKeyPassword)
  @longName("key-password")
  @hasArg
  keyPassword: string;

  @help(Messages.TestCloud.Arguments.UITestsSignInfo)
  @longName("sign-info")
  @hasArg
  signInfo: string;

  @help(Messages.TestCloud.Arguments.UITestsToolsDir)
  @longName("uitest-tools-dir")
  @hasArg
  uiTestToolsDir: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(): Promise<string> {
    let preparer = new UITestPreparer(this.artifactsDir, this.buildDir, this.appPath);

    preparer.storeFile = this.storePath;
    preparer.storePassword = this.storePassword;
    preparer.keyAlias = this.keyAlias;
    preparer.keyPassword = this.keyPassword;
    preparer.uiTestToolsDir = this.uiTestToolsDir;

    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.buildDir;
  }
}
