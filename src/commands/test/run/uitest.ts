import { CommandArgs, help, name, longName, hasArg, ErrorCodes, required } from "../../../util/commandLine";
import { RunTestsCommand } from "../lib/run-tests-command";
import { UITestPreparer } from "../lib/uitest-preparer";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.RunUITests)
export default class RunUITestsCommand extends RunTestsCommand {
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

  @help(Messages.TestCloud.Arguments.UITestsStoreFile)
  @longName("store-file")
  @hasArg
  storeFile: string;

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

  protected prepareManifest(artifactsDir: string): Promise<string> {
    let preparer = new UITestPreparer(artifactsDir, this.buildDir, this.appPath);

    preparer.storeFile = this.storeFile;
    preparer.storePassword = this.storePassword;
    preparer.keyAlias = this.keyAlias;
    preparer.keyPassword = this.keyPassword;
    preparer.uiTestToolsDir = this.uiTestToolsDir;

    return preparer.prepare();
  }
}