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

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    let preparer = new AppiumPreparer(artifactsDir, this.buildDir);
    return preparer.prepare();
  }
  
  protected getSourceRootDir() {
    return this.buildDir;
  }
}