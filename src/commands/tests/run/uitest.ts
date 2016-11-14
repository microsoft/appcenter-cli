import { CommandArgs, help, name, longName, hasArg, ErrorCodes, required } from "../../../util/commandLine";
import { RunTestsCommand } from "../lib/run-tests-command";
import { UITestPreparer } from "../lib/uitest-preparer";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";

@help("Prepares and runs UI Tests")
export default class RunUITestsCommand extends RunTestsCommand {
  @help("Path to an application file")
  @longName("app-path")
  @required
  @hasArg
  appPath: string;

  @help("Path to directory with test assemblies")
  @longName("assembly-dir")
  @required
  @hasArg
  assemblyDir: string;

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

  constructor(args: CommandArgs) {
    super(args);
  }

  protected async prepareArtifactsDir(artifactsDir: string): Promise<string> {
    let preparer = new UITestPreparer(artifactsDir, this.assemblyDir, this.appPath);

    preparer.storeFile = this.storeFile;
    preparer.storePassword = this.storePassword;
    preparer.keyAlias = this.keyAlias;
    preparer.keyPassword = this.keyPassword;
    preparer.include = this.include;
    preparer.testParameters = this.testParameters;

    return await preparer.prepare();
  }
}