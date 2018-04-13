import { AppCenterClient } from "../../util/apis";
import { TestReport } from "../../util/apis/generated/models";
import { AppCommand, CommandArgs, CommandResult, ErrorCodes, hasArg, help, longName, required, shortName, success, failure } from "../../util/commandline";
import { StreamingArrayOutput } from "../../util/interaction";
import { downloadArtifacts } from "../../util/misc/download";
import { generateAbsolutePath } from "../../util/misc/fs-helper";
import * as pfs from "../../util/misc/promisfied-fs";
import { getUser } from "../../util/profile";
import { Messages } from "./lib/help-messages";
import { StateChecker } from "./lib/state-checker";
import { buildErrorInfo } from "./lib/error-info-builder";
import { XmlUtil } from "./lib/xml-util";
import { XmlUtilBuilder } from "./lib/xml-util-builder";
import * as path from "path";

@help(Messages.TestCloud.Commands.Download)
export default class DownloadTestsCommand extends AppCommand {

  @help(Messages.TestCloud.Arguments.DownloadTestRunId)
  @longName("test-run-id")
  @hasArg
  @required
  testRunId: string;

  @help(Messages.TestCloud.Arguments.DownloadTestOutputDir)
  @longName("test-output-dir")
  @hasArg
  @required
  testOutputDir: string;

  @help(Messages.TestCloud.Arguments.MergedFileName)
  @longName("merged-file-name")
  @hasArg
  outputXmlName: string;

  @help(Messages.TestCloud.Arguments.Continuous)
  @shortName("c")
  @longName("continuous")
  continuous: boolean;

  private readonly streamingOutput = new StreamingArrayOutput();

  constructor(args: CommandArgs) {
    super(args);
  }

  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    try {
      this.streamingOutput.start();

      const checker = new StateChecker(client, this.testRunId, this.app.ownerName, this.app.appName, this.streamingOutput);

      if (this.continuous) {
        await checker.checkUntilCompleted();
      } else {
        const result: number = await checker.checkOnce();

        // undefined - in progress (validation, running, etc)
        if (typeof result === "undefined") {
          return failure(1, `The test run ${this.testRunId} is not complete, please try again once the test has completed successfully`);
        }
      }

      const testReport: TestReport = await client.test.getTestReport(this.testRunId, this.app.ownerName, this.app.appName);
      if (!testReport.stats.artifacts) {
        return failure(ErrorCodes.Exception, "XML reports have not been created");
      }

      await downloadArtifacts(this, this.streamingOutput, this.testOutputDir, this.testRunId, testReport.stats.artifacts);

      if (this.outputXmlName) {
        const xmlUtil: XmlUtil = XmlUtilBuilder.buildXmlUtil(testReport.stats.artifacts);
        const outputDir = generateAbsolutePath(this.testOutputDir);
        const pathToArchive: string = path.join(outputDir, xmlUtil.getArchiveName());
        const xml: Document = await xmlUtil.mergeXmlResults(pathToArchive);

        if (!xml) {
          return failure(ErrorCodes.Exception, "XML merging has ended with an error");
        }
        const xmlPath = path.join(outputDir, this.outputXmlName);
        await pfs.writeFile(xmlPath, xml);

        this.streamingOutput.text((command: AppCommand): string => {
          return `Merged test results to ${xmlPath}`;
        }, this);
      }

      return success();
    } catch (err) {
      const errInfo: { message: string, exitCode: number } = buildErrorInfo(err, getUser(), this);
      return failure(errInfo.exitCode, errInfo.message);
    } finally {
      this.streamingOutput.finish();
    }
  }
}
