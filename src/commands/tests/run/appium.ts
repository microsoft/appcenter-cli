import { AppCommand, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn, ErrorCodes } from "../../../util/commandLine";
import { AppiumPreparer } from "../lib/appium-preparer";
import { TestCloudUploader, StartedTestRun } from "../lib/test-cloud-uploader";
import { SonomaClient } from "../../../util/apis";
import { getUser } from "../../../util/profile";
import { out } from "../../../util/interaction";
import { progressWithResult } from "../lib/interaction";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";
import * as temp from "temp";
import * as pfs from "../../../util/misc/promisfied-fs";

@help("Prepares and runs Appium tests")
export default class RunAppiumTestsCommand extends AppCommand {
  @help("Path to an application file")
  @longName("app-path")
  @hasArg
  @required
  appPath: string;

  @help("Selected devices slug")
  @longName("devices")
  @hasArg
  @required
  devices: string;

  @help("Path to Appium output directory (usually target/upload)")
  @longName("build-dir")
  @hasArg
  buildDir: string;

  @help("Path to Appium test project that should be built")
  @longName("project-dir")
  @hasArg
  projectDir: string;

  @help("Path to dSym files")
  @longName("dsym-path")
  @hasArg
  dSymPath: string;

  @help("Locale for the test run (e.g. en-US)")
  @longName("locale")
  @hasArg
  locale: string;

  @help("Test series name")
  @longName("test-series")
  @hasArg
  testSeries: string;

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

  public async run(client: SonomaClient): Promise<CommandResult> {
    try {
      let tempArtifactsDir = temp.mkdirSync("mc-appium-upload");
      try {
        let manifestPath = await progressWithResult("Preparing Appium tests", this.prepareArtifactsDir(tempArtifactsDir));
        let testRun = await this.uploadAndStart(client, manifestPath);
        
        out.text(`Test run id: "${testRun.testRunId}"`);
        out.text("Accepted devices: ");
        out.list(item => `  - ${item}`, testRun.acceptedDevices);
        
        if (testRun.rejectedDevices && testRun.rejectedDevices.length > 0) {
          out.text("Rejected devices: ");
          out.list(item => `  - ${item}`, testRun.rejectedDevices);
        }

        return success();
      }
      finally {
        await pfs.rmDir(tempArtifactsDir, true);
      }
    } 
    catch (err) {
      return failure(ErrorCodes.Exception, err.message);
    }
  }

  private async prepareArtifactsDir(artifactsDir: string): Promise<string> {
    let preparer = new AppiumPreparer(artifactsDir, this.projectDir, this.buildDir);
    preparer.include = parseIncludedFiles(this.include || []);
    preparer.testParameters = parseTestParameters(this.testParameters || []);

    return await preparer.prepare();
  }

  private async uploadAndStart(client: SonomaClient, manifestPath: string): Promise<StartedTestRun> {
    let uploader = new TestCloudUploader(
      client, 
      getUser().userName,
      this.app.appName,
      manifestPath,
      this.devices);

    uploader.appPath = this.appPath;
    uploader.locale = this.locale;
    uploader.testSeries = this.testSeries;

    return await uploader.uploadAndStart();
  }
}