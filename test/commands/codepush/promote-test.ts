import CodePushPromoteCommand from "../../../src/commands/codepush/promote";
import { CommandArgs, ErrorCodes } from "../../../src/util/commandline";
import { out } from "../../../src/util/interaction";
import { expect } from "chai";
import * as Nock from "nock";
import * as Sinon from "sinon";
import { getFakeParamsForRequest } from "./utils";

describe("codepush promote", function () {
  let sandbox: Sinon.SinonSandbox;
  const app = "bogus/NameApp";
  const deployment = "bogusDeployment";
  const sourceDeploymentName = "Staging";

  const goldenPathArgs: CommandArgs = {
    args: ["--rollout", "50", "--app", app, "--s", "Staging", "--d", deployment, "--token", getFakeParamsForRequest().token],
    command: ["codepush", "promote"],
    commandPath: "fake/path",
  };

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("promote works successfully with all parameters provided", async function () {
    // Arrange
    const promoteCommand = new CodePushPromoteCommand(goldenPathArgs);
    Nock("https://api.appcenter.ms/")
      .post(`/v0.1/apps/${app}/deployments/${sourceDeploymentName}/promote_release/${deployment}`)
      .reply(200, { success: true });

    // Act
    const result = await promoteCommand.execute();

    // Assert
    expect((result as any).succeeded).to.be.true;
  });

  it("promote works successfully when label is provided", async function () {
    // Arrange
    const label = "TestLabel";
    const args: CommandArgs = { ...goldenPathArgs, args: [...goldenPathArgs.args, "--l", label, "--token", getFakeParamsForRequest().token] };
    const outTextSpy = sandbox.spy(out, "text");
    const promoteCommand = new CodePushPromoteCommand(args);
    Nock("https://api.appcenter.ms/")
      .post(`/v0.1/apps/${app}/deployments/${sourceDeploymentName}/promote_release/${deployment}`)
      .reply(200, { success: true });

    // Act
    const result = await promoteCommand.execute();

    // Assert
    expect((result as any).succeeded).to.be.true;
    expect(outTextSpy.args[0][0]).contains(label);
  });

  it("executes error if the rollout value is incorrect one", async function () {
    // Arrange
    const args: CommandArgs = {
      ...goldenPathArgs,
      args: ["--rollout", "200", "--app", app, "--s", sourceDeploymentName, "--d", deployment, "--token", getFakeParamsForRequest().token],
    };
    const promoteCommand = new CodePushPromoteCommand(args);

    // Act
    const result = await promoteCommand.execute();

    // Assert
    expect((result as any).errorCode).to.be.equal(ErrorCodes.Exception);
    expect((result as any).errorMessage).contains("Rollout value should be integer value between");
  });

  it("executes error if the target binary version is incorrect one", async function () {
    // Arrange
    const args: CommandArgs = {
      ...goldenPathArgs,
      args: ["--t", "200.2.g.1", "--app", app, "--s", sourceDeploymentName, "--d", deployment, "--token", getFakeParamsForRequest().token],
    };
    const promoteCommand = new CodePushPromoteCommand(args);

    // Act
    const result = await promoteCommand.execute();

    // Assert
    expect((result as any).errorCode).to.be.equal(ErrorCodes.Exception);
    expect((result as any).errorMessage).contains("Invalid binary version(s) for a release.");
  });

  it("makes warning on promote api call 409 status code", async function () {
    // Arrange
    const args: CommandArgs = { ...goldenPathArgs, args: [...goldenPathArgs.args, "--disable-duplicate-release-error", "--token", getFakeParamsForRequest().token] };
    const promoteCommand = new CodePushPromoteCommand(args);
    const consoleWarnSpy = sandbox.spy(console, "warn");
    Nock("https://api.appcenter.ms/")
      .post(`/v0.1/apps/${app}/deployments/${sourceDeploymentName}/promote_release/${deployment}`)
      .reply(409, { message: "Error" });

    // Act
    await promoteCommand.execute();

    // Assert
    expect(consoleWarnSpy.calledOnce).to.be.true;
  });

  it("executes error on promote api call other errors handling", async function () {
    // Arrange
    const promoteCommand = new CodePushPromoteCommand(goldenPathArgs);
    const errorMessage = "Some error message";
    Nock("https://api.appcenter.ms/")
      .post(`/v0.1/apps/${app}/deployments/${sourceDeploymentName}/promote_release/${deployment}`)
      .reply(410, errorMessage);

    // Act
    const result = await promoteCommand.execute();

    // Assert
    expect((result as any).errorCode).to.be.equal(ErrorCodes.Exception);
    expect((result as any).errorMessage).equals(errorMessage);
  });
});
