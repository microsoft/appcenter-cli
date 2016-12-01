import { CommandArgs, help, name, longName, hasArg, ErrorCodes, required } from "../../../util/commandLine";
import { RunTestsCommand } from "../lib/run-tests-command";
import { UITestPreparer } from "../lib/uitest-preparer";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";

@help("Prepares and runs UI tests")
export default class RunUITestsCommand extends RunTestsCommand {
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

  protected prepareManifest(artifactsDir: string): Promise<string> {
    let preparer = new UITestPreparer(artifactsDir, this.buildDir, this.appPath);

    preparer.storeFile = this.storeFile;
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