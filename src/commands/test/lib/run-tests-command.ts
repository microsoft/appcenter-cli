import {
  AppCommand, CommandArgs, CommandResult,
  help, success, shortName, longName, required, hasArg,
  failure
} from "../../../util/commandline";

import { TestCloudUploader, StartedTestRun } from "./test-cloud-uploader";
import { StateChecker } from "./state-checker";
import { AppCenterClient } from "../../../util/apis";
import { StreamingArrayOutput } from "../../../util/interaction";
import { getUser } from "../../../util/profile";
import { parseTestParameters } from "./parameters-parser";
import { processIncludedFiles } from "./included-files-parser";
import { progressWithResult } from "./interaction";
import { ITestCloudManifestJson } from "./test-manifest-reader";
import { Messages } from "./help-messages";
import * as _ from "lodash";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as path from "path";
import * as os from "os";
import { buildErrorInfo } from "../lib/error-info-builder";

export abstract class RunTestsCommand extends AppCommand {

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

  @help(Messages.TestCloud.Arguments.Timeout)
  @longName("timeout")
  @hasArg
  timeoutSec: number;

  @help(Messages.TestCloud.Arguments.VSTSIdVariable)
  @longName("vsts-id-variable")
  @hasArg
  vstsIdVariable: string;

  protected isAppPathRequired = true;
  private readonly streamingOutput = new StreamingArrayOutput();

  constructor(args: CommandArgs) {
    super(args);

    this.testParameters = this.fixArrayParameter(this.testParameters);
    this.include = this.fixArrayParameter(this.include);

    if (this.timeoutSec && typeof this.timeoutSec === "string") {
      this.timeoutSec = parseInt(this.timeoutSec, 10);
    }
  }

  // Override this if you need to validate options
  protected async validateOptions(): Promise<void> {
    return;
  }

    // Override this if additional processing is needed need after test run completes
  protected async afterCompletion(client: AppCenterClient, testRun: StartedTestRun, streamingOutput: StreamingArrayOutput): Promise<void> {
    return;
  }

  // TODO: There is technical debt here.
  // There is a lot of confusion and even duplicated code with respect to test params,
  // included files and responsibility of prepare vs run.
  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    if (this.isAppPathRequired && !this.appPath) {
      throw new Error("Argument --app-path is required");
    }
    await this.validateOptions();
    try {
      const artifactsDir = await this.getArtifactsDir();
      this.streamingOutput.start();
      try {
        const manifestPath = await progressWithResult("Preparing tests", this.prepareManifest(artifactsDir));
        await this.updateManifestAndCopyFilesToArtifactsDir(manifestPath);
        const testRun = await this.uploadAndStart(client, manifestPath, portalBaseUrl);

        const vstsIdVariable = this.vstsIdVariable;
        this.streamingOutput.text(function (testRun) {
          let report: string = `Test run id: "${testRun.testRunId}"` + os.EOL;
          if (vstsIdVariable) {
            report = `##vso[task.setvariable variable=${vstsIdVariable}]${testRun.testRunId}` + os.EOL;
          }
          report += "Accepted devices: " + os.EOL;
          testRun.acceptedDevices.map((item) => `  - ${item}`).forEach((text) => report += text + os.EOL);
          if (testRun.rejectedDevices && testRun.rejectedDevices.length > 0) {
            report += "Rejected devices: " + os.EOL;
            testRun.rejectedDevices.map((item) => `  - ${item}`).forEach((text) => report += text + os.EOL);
          }
          return report;
        }, testRun );

        if (!this.async) {
          const exitCode = await this.waitForCompletion(client, testRun.testRunId);
          await this.afterCompletion(client, testRun, this.streamingOutput);

          switch (exitCode) {
            case 1:
              return failure(exitCode, `There were Test Failures.${os.EOL}Test Report: ${testRun.testRunUrl}`);
            case 2:
              return failure(exitCode, `Cannot run tests. Returning exit code ${exitCode}.
                ${os.EOL}Test Report: ${testRun.testRunUrl}`);
          }
        }

        if (!(this.async && this.format)) {
          this.streamingOutput.text(function (testRun) {
            const report: string = `Test Report: ${testRun.testRunUrl}` + os.EOL;
            return report;
          }, testRun );
        }

        return success();
      }
      finally {
        await this.cleanupArtifactsDir(artifactsDir);
        this.streamingOutput.finish();
      }
    } catch (err) {
      const errInfo: { message: string, exitCode: number } = buildErrorInfo(err, getUser(), this);
      return failure(errInfo.exitCode, errInfo.message);
    }
  }

  private async updateManifestAndCopyFilesToArtifactsDir(manifestPath: string): Promise<void> {
    const manifestJson = await pfs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestJson) as ITestCloudManifestJson;
    manifest.cliVersion = this.getVersion();

    await processIncludedFiles(manifest, this.include, path.dirname(manifestPath), this.getSourceRootDir());

    const modifiedManifest = JSON.stringify(manifest, null, 1);
    await pfs.writeFile(manifestPath, modifiedManifest);
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    throw new Error("This method must be overriden in derived classes");
  }

  protected getSourceRootDir(): string {
    throw new Error("This method must be overriden in derived classes");
  }

  protected async cleanupArtifactsDir(artifactsDir: string): Promise<void> {
    await pfs.rmDir(artifactsDir, true).catch(function (err) {
      console.warn(`${err} while cleaning up artifacts directory ${artifactsDir}. This is often due to files being locked or in use. Please check your virus scan settings and any local security policies you might have in place for this directory. Continuing without cleanup.`);
    });
  }

  private artifactsDir: string;

  protected async getArtifactsDir(): Promise<string> {
    return this.artifactsDir || (this.artifactsDir = await pfs.mkTempDir("appcenter-upload"));
  }

  protected async uploadAndStart(client: AppCenterClient, manifestPath: string, portalBaseUrl: string): Promise<StartedTestRun> {
    const uploader = new TestCloudUploader(
      client,
      this.app.ownerName,
      this.app.appName,
      manifestPath,
      this.devices,
      portalBaseUrl);

    uploader.appPath = this.appPath;
    uploader.language = this.language;
    uploader.locale = this.locale;
    uploader.testSeries = this.testSeries;
    uploader.testParameters = this.combinedParameters();

    if (this.dSymDir) {
      console.warn("The option --dsym-dir is deprecated and ignored");
    }

    return await uploader.uploadAndStart();
  }

  private combinedParameters() : {} {
    const parameters = this.getParametersFromOptions();

    if (this.testParameters) {
      return _.merge(parameters, parseTestParameters(this.testParameters));
    } else {
      return parameters;
    }
  }

  protected getParametersFromOptions() : {} {
    return {};
  }

  private waitForCompletion(client: AppCenterClient, testRunId: string): Promise<number> {
    const checker = new StateChecker(client, testRunId, this.app.ownerName, this.app.appName, this.streamingOutput);
    return checker.checkUntilCompleted(this.timeoutSec);
  }
}
