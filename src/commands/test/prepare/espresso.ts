import { CommandArgs, help, success, name, shortName, longName, required, hasArg,
         ErrorCodes } from "../../../util/commandLine";
import { EspressoPreparer } from "../lib/espresso-preparer";
import { PrepareTestsCommand } from "../lib/prepare-tests-command";
import { out } from "../../../util/interaction";

@help("Prepares Espresso artifacts for test run")
export default class PrepareEspressoCommand extends PrepareTestsCommand {
  @help("Path to Espresso output directory (usually <project>/build/outputs/apk)")
  @longName("build-dir")
  @hasArg
  buildDir: string;

  @help("Path to Espresso tests .apk file (default uses build-dir to detect this file)")
  @longName("test-apk-path")
  @hasArg
  testApkPath: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(): Promise<string> {
    let preparer = new EspressoPreparer(this.artifactsDir, this.buildDir, this.testApkPath);
    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.buildDir;
  }
}