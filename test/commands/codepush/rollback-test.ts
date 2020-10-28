import CodePushRollbackCommand from "../../../src/commands/codepush/rollback";
import { expect } from "chai";
import { CommandArgs, ErrorCodes } from "../../../src/util/commandline";
import { out, prompt } from "../../../src/util/interaction";
import * as Nock from "nock";
import * as Sinon from "sinon";
import { getFakeParamsForRequest } from "./utils";

describe("codepush rollback", function () {
  let sandbox: Sinon.SinonSandbox;
  let outProgressSpy: Sinon.SinonSpy<[string, Promise<unknown>], Promise<unknown>>;
  const app = "bogus/NameApp";
  const deployment = "bogusDeployment";
  const args: CommandArgs = {
    args: ["--app", app, "--target-release", "bogusRelease", deployment, "--token", getFakeParamsForRequest().token],
    command: ["codepush", "rollback"],
    commandPath: "fake/path",
  };

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    outProgressSpy = sandbox.spy(out, "progress");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("executes rollback operation with all parameters provided and stop when user declines it", async function () {
    // Arrange
    sandbox.stub(prompt, "confirm").resolves(false);
    const rollbackCommand = new CodePushRollbackCommand(args);

    // Act
    await rollbackCommand.execute();

    // Assert
    expect(outProgressSpy.callCount).to.be.equal(0);
  });

  it("executes error from service on actual http rollback command is propagated to the output", async function () {
    // Arrange
    sandbox.stub(prompt, "confirm").resolves(true);
    const rollbackCommand = new CodePushRollbackCommand(args);
    Nock("https://api.appcenter.ms/").post(`/v0.1/apps/${app}/deployments/${deployment}/rollback_release`).reply(200, {});

    // Act
    const result = await rollbackCommand.execute();

    // Assert
    expect((result as any).errorCode).to.be.equal(ErrorCodes.Exception);
    expect(outProgressSpy.callCount).to.be.equal(1);
  });

  it("successfully performed a rollback operation with all parameters provided", async function () {
    // Arrange
    sandbox.stub(prompt, "confirm").resolves(true);
    const rollbackCommand = new CodePushRollbackCommand(args);
    Nock("https://api.appcenter.ms/")
      .post(`/v0.1/apps/${app}/deployments/${deployment}/rollback_release`)
      .reply(201, { success: true });

    // Act
    const result = await rollbackCommand.execute();

    // Assert
    expect((result as any).succeeded).to.be.true;
    expect(outProgressSpy.callCount).to.be.equal(1);
  });
});
