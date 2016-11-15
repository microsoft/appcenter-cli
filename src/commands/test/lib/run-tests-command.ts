import { AppCommand, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         failure, ErrorCodes } from "../../../util/commandLine";
import { TestCloudUploader, StartedTestRun } from "./test-cloud-uploader";
import { TestCloudError } from "./test-cloud-error";
import { StateChecker } from "./state-checker";
import { MobileCenterClient } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { progressWithResult } from "./interaction";
import { parseTestParameters } from "./parameters-parser";
import { parseIncludedFiles } from "./included-files-parser";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as temp from "temp";

export class RunTestsCommand extends AppCommand {
  @help("Path to an application file")
  @longName("app-path")
  @hasArg
  appPath: string;

  @help("Selected devices slug")
  @longName("devices")
  @hasArg
  @required
  devices: string;

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

  @help("Don't block waiting for test results")
  @longName("async")
  async: boolean;

  constructor(args: CommandArgs) {
    super(args);

    if (!this.testParameters) {
      this.testParameters = [];
    }
    else if (typeof this.testParameters === "string") {
      this.testParameters = [ this.testParameters ];
    }

    if (!this.include) {
      this.include = [];
    }
    else if (typeof this.include === "string") {
      this.include = [ this.include ];
    }
  }

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    try {
      let artifactsDir = await this.getArtifactsDir();
      
      try {
        let manifestPath = await progressWithResult("Preparing tests", this.prepareArtifactsDir(artifactsDir));
        let testRun = await this.uploadAndStart(client, manifestPath);
        
        out.text(`Test run id: "${testRun.testRunId}"`);
        out.text("Accepted devices: ");
        out.list(item => `  - ${item}`, testRun.acceptedDevices);
        
        if (testRun.rejectedDevices && testRun.rejectedDevices.length > 0) {
          out.text("Rejected devices: ");
          out.list(item => `  - ${item}`, testRun.rejectedDevices);
        }

        if (!this.async) {
          await this.waitForCompletion(client, testRun.testRunId);
        }

        return success();
      }
      finally {
        await this.cleanupArtifactsDir(artifactsDir);
      }
    } 
    catch (err) {
      let exitCode = err.exitCode || ErrorCodes.Exception;
      return failure(exitCode, err.message);
    }
  }

  protected prepareArtifactsDir(artifactsDir: string): Promise<string> {
    throw new Error("This method must be overriden in derived classes");
  }

  protected async cleanupArtifactsDir(artifactsDir: string): Promise<void> {
    await pfs.rmDir(artifactsDir, true);
  }

  protected getArtifactsDir(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      temp.mkdir("mobile-center-upload", (err, dirPath) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(dirPath);
        }
      });
    });
  }

  protected async uploadAndStart(client: MobileCenterClient, manifestPath: string): Promise<StartedTestRun> {
    let uploader = new TestCloudUploader(
      client, 
      this.app.ownerName,
      this.app.appName,
      manifestPath,
      this.devices);

    uploader.appPath = this.appPath;
    uploader.locale = this.locale;
    uploader.testSeries = this.testSeries;

    return await uploader.uploadAndStart();
  }

  private async waitForCompletion(client: MobileCenterClient, testRunId: string): Promise<void> {
    let checker = new StateChecker(client, testRunId, this.app.ownerName, this.app.appName);
    let exitCode = await checker.checkUntilCompleted();

    if (exitCode !== 0) {
      throw new TestCloudError("Test run failed. Please inspect logs for more details", exitCode);
    }
  }
}