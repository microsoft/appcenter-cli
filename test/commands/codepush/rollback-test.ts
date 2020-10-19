import { expect } from "chai";
import * as Sinon from "sinon";
import CodePushRollbackCommand from "../../../src/commands/codepush/rollback";
import { CommandArgs } from "../../../src/util/commandline";
import { out, prompt } from "../../../src/util/interaction";

describe("codepush rollback", function () {
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("executes rollback operation with all parameters provided and stop when user decline", async function () {
    // Arrange
    const args: CommandArgs = {
      args: ["--target-release", "bogusRelease", "bogusDeployment"],
      command: ["codepush", "rollback"],
      commandPath: "fake/path",
    };

    sandbox.stub(prompt, "confirm").resolves(false);
    const outProgressSpy = sandbox.spy(out, "progress");

    const patchCommand = new CodePushRollbackCommand(args);

    // Act
    await patchCommand.execute();

    // Assert
    expect(outProgressSpy.callCount).to.be.equal(0);
  });
});
