import { expect } from "chai";
import * as MockRequire from "mock-require";
import * as path from "path";
import { CommandArgs } from "../../../../src/util/commandline";

let testCloudCommand = "";
let testCloudCommandArgs: string[] = [];

// Mocking process-helper
MockRequire("../../../../src/util/misc/process-helper", {
  execWithArgsAndWait: async (
    file: string,
    args: string[],
    onStdOut?: (text: string) => void,
    onStdErr?: (text: string) => void
  ): Promise<number> => {
    testCloudCommand = file;
    testCloudCommandArgs = args;
    return 0;
  },
});

import RunUITestsCommand from "../../../../src/commands/test/run/uitest";

describe("Validating UITest run", () => {
  it("should include sign-info for test-cloud prepare command", async () => {
    // Arrange
    const toolsDir = path.join(__dirname, "../sample-test-workspace");
    const args: CommandArgs = {
      command: ["test", "run", "uitest"],
      commandPath: "Test",
      args: [
        "--app",
        "test_org/SampleApp",
        "--devices",
        "test_org/latest",
        "--app-path",
        "test-apps/Android/SampleApp.apk",
        "--test-series",
        "master",
        "--build-dir",
        "test_dir",
        "--uitest-tools-dir",
        toolsDir,
        "--sign-info",
        "testserver.si",
      ],
    };

    const command = new RunUITestsCommand(args);

    // Act
    await (command as any).prepareManifest("artifacts_dir");

    // Assert
    expect(testCloudCommand).equal("mono");
    expect(testCloudCommandArgs).satisfy((args: string[]) => args.indexOf(path.join(toolsDir, "test-cloud.exe")) === 0);
    const argsStr = testCloudCommandArgs.join(" ");
    expect(argsStr).contain("prepare test-apps/Android/SampleApp.apk");
    expect(argsStr).contain("--sign-info testserver.si");
    expect(argsStr).contain("--assembly-dir test_dir");
    expect(argsStr).contain("--artifacts-dir artifacts_dir");
  });
});

after(() => {
  MockRequire.stop("../../../../src/util/misc/process-helper");
});
