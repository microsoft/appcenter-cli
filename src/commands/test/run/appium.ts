import { CommandArgs, help, name, longName, hasArg, ErrorCodes } from "../../../util/commandLine";
import { RunTestsCommand } from "../lib/run-tests-command";
import { AppiumPreparer } from "../lib/appium-preparer";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";

@help("Prepares and runs Appium tests")
export default class RunAppiumTestsCommand extends RunTestsCommand {
  @help("Path to Appium output directory (usually target/upload)")
  @longName("build-dir")
  @hasArg
  buildDir: string;

  @help("Path to Appium test project that should be built")
  @longName("project-dir")
  @hasArg
  projectDir: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected async prepareArtifactsDir(artifactsDir: string): Promise<string> {
    let preparer = new AppiumPreparer(artifactsDir, this.projectDir, this.buildDir);
    preparer.include = parseIncludedFiles(this.include || []);
    preparer.testParameters = parseTestParameters(this.testParameters || []);

    return await preparer.prepare();
  }
}