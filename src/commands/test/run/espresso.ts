import { CommandArgs, help, name, longName, hasArg, ErrorCodes } from "../../../util/commandLine";
import { RunTestsCommand } from "../lib/run-tests-command";
import { EspressoPreparer } from "../lib/espresso-preparer";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";

@help("Prepares and runs Espresso tests")
export default class RunEspressoTestsCommand extends RunTestsCommand {
  @help("Path to Espresso build directory (usually <project>/build/outputs/apk)")
  @longName("build-dir")
  @hasArg
  buildDir: string;

  @help("Path to Espresso test project that should be built")
  @longName("project-dir")
  @hasArg
  projectDir: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected async prepareArtifactsDir(artifactsDir: string): Promise<string> {
    let preparer = new EspressoPreparer(artifactsDir, this.projectDir, this.buildDir);
    preparer.include = parseIncludedFiles(this.include || []);
    preparer.testParameters = parseTestParameters(this.testParameters || []);

    return await preparer.prepare();
  }
}