import { RunTestsCommand } from "./run-tests-command";
import { hasArg, help, longName } from "../../../util/commandline";
import { Messages } from "./help-messages";
import { AppCenterClient } from "../../../util/apis";
import { StartedTestRun } from "./test-cloud-uploader";
import { TestReport } from "../../../util/apis/generated/models";
import * as downloadUtil from "../../../util/misc/download";
import { StreamingArrayOutput } from "../../../util/interaction";

export abstract class RunTestsDownloadResultCommand extends RunTestsCommand {
    @help(Messages.TestCloud.Arguments.TestOutputDir)
    @longName("test-output-dir")
    @hasArg
    testOutputDir: string;

    protected abstract async mergeTestArtifacts(): Promise<void>;

    protected async afterCompletion(client: AppCenterClient, testRun: StartedTestRun, streamingOutput: StreamingArrayOutput): Promise<void> {
        if (this.testOutputDir) {
            // Download json test result
            const testReport: TestReport = await client.test.getTestReport(testRun.testRunId, this.app.ownerName, this.app.appName);
            if (testReport.stats.artifacts) {
                await downloadUtil.downloadArtifacts(this, streamingOutput, this.testOutputDir, testRun.testRunId, testReport.stats.artifacts);
                await this.mergeTestArtifacts();
            }
        }
    }
}
