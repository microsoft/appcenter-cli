import { AppCommand, CommandArgs, CommandResult,
         help, success, name, shortName, longName, required, hasArg,
         failure, ErrorCodes } from "../../../util/commandline";
import { TestCloudUploader, StartedTestRun } from "./test-cloud-uploader";
import { TestCloudError } from "./test-cloud-error";
import { StateChecker } from "./state-checker";
import { MobileCenterClient } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { parseTestParameters } from "./parameters-parser";
import { parseIncludedFiles } from "./included-files-parser";
import { progressWithResult } from "./interaction";
import { ITestCloudManifestJson, ITestFrameworkJson, IFileDescriptionJson } from "./test-manifest-reader";
import { Messages } from "./help-messages";
import * as _ from "lodash";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as path from "path";
import * as temp from "temp";

export class RunTestsCommand extends AppCommand {
  @help(Messages.TestCloud.Arguments.AppPath)
  @longName("app-path")
  @hasArg
  appPath: string;

  @help(Messages.TestCloud.Arguments.RunDevices)
  @longName("devices")
  @hasArg
  @required
  devices: string;

  @help(Messages.TestCloud.Arguments.RunDSymDir)
  @longName("dsym-dir")
  @hasArg
  dSymDir: string;

  @help(Messages.TestCloud.Arguments.RunLocale)
  @longName("locale")
  @hasArg
  locale: string;

  @help(Messages.TestCloud.Arguments.RunLanguage)
  @longName("language")
  @hasArg
  language: string;

  @help(Messages.TestCloud.Arguments.RunTestSeries)
  @longName("test-series")
  @hasArg
  testSeries: string;

  @help(Messages.TestCloud.Arguments.Include)
  @longName("include")
  @hasArg
  include: string[];

  @help(Messages.TestCloud.Arguments.TestParameter)
  @longName("test-parameter")
  @shortName("p")
  @hasArg
  testParameters: string[];

  @help(Messages.TestCloud.Arguments.RunAsync)
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

  // Override this if you need to validate options
  protected async validateOptions(): Promise<void> {
  }

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    await this.validateOptions();
    try {
      let artifactsDir = await this.getArtifactsDir();

      try {
        let manifestPath = await progressWithResult("Preparing tests", this.prepareManifest(artifactsDir));
        await this.addIncludedFilesAndTestParametersToManifest(manifestPath);
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

  private async addIncludedFilesAndTestParametersToManifest(manifestPath: string): Promise<void> {
    let manifestJson = await pfs.readFile(manifestPath, "utf8");
    let manifest = JSON.parse(manifestJson) as ITestCloudManifestJson;

    await this.addIncludedFiles(path.dirname(manifestPath), manifest);
    await this.addTestParameters(manifest);

    let modifiedJson = JSON.stringify(manifest, null, 1);
    await pfs.writeFile(manifestPath, modifiedJson);
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    throw new Error("This method must be overriden in derived classes");
  }

  protected getSourceRootDir(): string {
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
    uploader.language = this.language;
    uploader.locale = this.locale;
    uploader.testSeries = this.testSeries;
    uploader.dSymPath = this.dSymDir;

    return await uploader.uploadAndStart();
  }

  private async waitForCompletion(client: MobileCenterClient, testRunId: string): Promise<void> {
    let checker = new StateChecker(client, testRunId, this.app.ownerName, this.app.appName);
    let exitCode = await checker.checkUntilCompleted();

    if (exitCode !== 0) {
      throw new TestCloudError("Test run failed. Please inspect logs for more details", exitCode);
    }
  }

  protected async addIncludedFiles(artifactsDir: string, manifest: ITestCloudManifestJson): Promise<void> {
    if (!this.include) {
      return;
    }

    let includedFiles = parseIncludedFiles(this.include, this.getSourceRootDir());
    for (let i = 0; i < includedFiles.length; i++) {
      let includedFile = includedFiles[i];
      let copyTarget = path.join(artifactsDir, includedFile.targetPath);
      await pfs.cp(includedFile.sourcePath, copyTarget);

      manifest.files.push(includedFile.targetPath);
    }
  }

  protected async addTestParameters(manifest: ITestCloudManifestJson): Promise<void> {
    if (!this.testParameters) {
      return;
    }

    let parsedParameters = parseTestParameters(this.testParameters);
    _.merge(manifest.testFramework.data, parsedParameters || {});
  }
}