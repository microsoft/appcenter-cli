import { Command, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn, ErrorCodes } from "../../../util/commandLine";
import { AppiumPreparer } from "../lib/appium-preparer";
import { out } from "../../../util/interaction";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";

@help("Prepares Appium artifacts for test run")
export default class PrepareAppiumCommand extends Command {
  @help("Path to output directory where all test files will be copied")
  @longName("artifacts-dir")
  @hasArg
  artifactsDir: string;

  @help("Path to Appium output directory (usually target/upload)")
  @longName("build-dir")
  @hasArg
  buildDir: string;

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

    if (typeof this.testParameters === "string") {
      this.testParameters = [ this.testParameters ];
    }

    if (typeof this.include === "string") {
      this.include = [ this.include ];
    }
  }

  public async runNoClient(): Promise<CommandResult> {
    try {
      let preparer = new AppiumPreparer(this.artifactsDir, this.buildDir);
      preparer.include = parseIncludedFiles(this.include || []);
      preparer.testParameters = parseTestParameters(this.testParameters || []);

      let manifestPath = await preparer.prepare();
      out.text(`Appium tests are ready to run. Manifest file was written to ${manifestPath}.`);
      return success();
    } 
    catch (err) {
      return failure(ErrorCodes.Exception, err.message);
    }
  }
}