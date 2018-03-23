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
import { XmlUtil } from "./util/xml-util";
import { NUnitXmlUtil } from "./util/nunit-xml-util";
import { JUnitXmlUtil } from "./util/junit-xml-util";
import * as os from "os";
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
  outputDir: string;

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

      let checker = new StateChecker(client, this.testRunId, this.app.ownerName, this.app.appName, this.streamingOutput);

      if (this.continuous) {
        await checker.checkUntilCompleted();
      } else {
        let result: number = await checker.checkOnce();

        // undefined - in progress (validation, running, etc)
        if (typeof result === "undefined") {
          return success();
        }
      }

      var testReport: TestReport = await client.test.getTestReport(this.testRunId, this.app.ownerName, this.app.appName);
      if (!testReport.stats.artifacts) {
        return failure(ErrorCodes.Exception, "XML reports have not been created");
      }

      await downloadArtifacts(this, this.streamingOutput, this.outputDir, this.testRunId, testReport.stats.artifacts);

      let xmlUtil: XmlUtil = null;
      let archiveName: string = null;
      if (testReport.stats.artifacts["nunit_xml_zip"]) {

        archiveName = "nunit_xml_zip.zip";
        xmlUtil = new NUnitXmlUtil();
      } else if (testReport.stats.artifacts["junit_xml_zip"]) {

        archiveName = "junit_xml_zip.zip";
        xmlUtil = new JUnitXmlUtil();
      } else {
        return failure(ErrorCodes.Exception, "Unexpected reports type");
      }

      let outputDir = generateAbsolutePath(this.outputDir);
      let pathToArchive: string = path.join(outputDir, archiveName);
      let xml: Document = await xmlUtil.mergeXmlResults(pathToArchive);

      if (!xml) {
        return failure(ErrorCodes.Exception, "XML merging has ended with an error");
      }

      await pfs.writeFile(path.join(outputDir, this.outputXmlName), xml);

      return success();
    } catch(err) {
      let exitCode = err.exitCode || err.errorCode || ErrorCodes.Exception;
      let message : string = null;
      let profile = getUser();

      let helpMessage = `Further error details: For help, please send both the reported error above and the following environment information to us by going to https://appcenter.ms/apps and starting a new conversation (using the icon in the bottom right corner of the screen)${os.EOL}
        Environment: ${os.platform()}
        App Upload Id: ${this.identifier}
        Timestamp: ${Date.now()}
        Operation: ${this.constructor.name}
        Exit Code: ${exitCode}`;

      if (profile) {
        helpMessage += `
        User Email: ${profile.email}
        User Name: ${profile.userName}
        User Id: ${profile.userId}
        `;
      }

      if (err.message && err.message.indexOf("Not Found") !== -1) {
        message = `Requested resource not found - please check --app: ${this.identifier}${os.EOL}${os.EOL}${helpMessage}`;
      } else if (err.errorCode === 5) {
        message = `Unauthorized error - please check --token or log in to the appcenter CLI.${os.EOL}${os.EOL}${helpMessage}`;
      } else if (err.errorMessage) {
        message = `${err.errorMessage}${os.EOL}${os.EOL}${helpMessage}`;
      } else {
        message = `${err.message}${os.EOL}${os.EOL}${helpMessage}`;
      }

      return failure(exitCode, message);
    } finally {
      this.streamingOutput.finish();
    }
  }
}