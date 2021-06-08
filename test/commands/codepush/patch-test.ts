import { CommandArgs, ErrorCodes } from "../../../src/util/commandline";
import { expect } from "chai";
import * as Sinon from "sinon";
import * as Nock from "nock";
import PatchCommand from "../../../src/commands/codepush/patch";
import { getFakeParamsForRequest } from "./utils";

describe("codepush patch", function () {
  let sandbox: Sinon.SinonSandbox;
  const app = "bogus/NameApp";
  const deployment = "bogusDeployment";
  const releaseLabel = "v1";

  const goldenPathArgs: CommandArgs = {
    args: [
      "--rollout",
      "50",
      "--existing-release-label",
      releaseLabel,
      "--app",
      app,
      deployment,
      "--token",
      getFakeParamsForRequest().token,
    ],
    command: ["codepush", "patch"],
    commandPath: "fake/path",
  };

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("patch works successfully with all parameters provided", async function () {
    // Arrange
    const patchCommand = new PatchCommand(goldenPathArgs);
    Nock("https://api.appcenter.ms/")
      .patch(`/v0.1/apps/${app}/deployments/${deployment}/releases/${releaseLabel}`)
      .reply(204, { success: true });

    // Act
    const result = await patchCommand.execute();

    // Assert
    expect((result as any).succeeded).to.be.true;
  });

  it("executes error because at least one parameter needs to be specified", async function () {
    // Arrange
    const args: CommandArgs = {
      ...goldenPathArgs,
      args: ["--app", app, deployment, "--token", getFakeParamsForRequest().token],
    };
    const patchCommand = new PatchCommand(args);

    // Act
    const result = await patchCommand.execute();

    // Assert
    expect((result as any).errorCode).to.be.equal(ErrorCodes.Exception);
    expect((result as any).errorMessage).contains("At least one property must be specified to patch a release.");
  });

  it("executes error because at least one parameter needs to be specified", async function () {
    // Arrange
    const args: CommandArgs = {
      ...goldenPathArgs,
      args: ["--app", app, deployment, "--token", getFakeParamsForRequest().token],
    };
    const patchCommand = new PatchCommand(args);

    // Act
    const result = await patchCommand.execute();

    // Assert
    expect((result as any).errorCode).to.be.equal(ErrorCodes.Exception);
    expect((result as any).errorMessage).contains("At least one property must be specified to patch a release.");
  });

  it("executes error if the rollout value is incorrect one", async function () {
    // Arrange
    const args: CommandArgs = {
      ...goldenPathArgs,
      args: ["--rollout", "200", "--app", app, deployment, "--token", getFakeParamsForRequest().token],
    };
    const patchCommand = new PatchCommand(args);

    // Act
    const result = await patchCommand.execute();

    // Assert
    expect((result as any).errorCode).to.be.equal(ErrorCodes.Exception);
    expect((result as any).errorMessage).contains("Rollout value should be integer value between");
  });

  it("executes error if the target binary version is incorrect one", async function () {
    // Arrange
    const args: CommandArgs = {
      ...goldenPathArgs,
      args: ["--t", "200.2.g.1", "--app", app, deployment, "--token", getFakeParamsForRequest().token],
    };
    const patchCommand = new PatchCommand(args);

    // Act
    const result = await patchCommand.execute();

    // Assert
    expect((result as any).errorCode).to.be.equal(ErrorCodes.Exception);
    expect((result as any).errorMessage).contains("Invalid binary version(s) for a release.");
  });

  it("executes error from service on actual PATCH command is propagated to the output", async function () {
    // Arrange
    const patchCommand = new PatchCommand(goldenPathArgs);
    const errorMessage = "some error message";
    Nock("https://api.appcenter.ms/")
      .patch(`/v0.1/apps/${app}/deployments/${deployment}/releases/${releaseLabel}`)
      .reply(400, errorMessage);

    // Act
    const result = await patchCommand.execute();

    // Assert
    expect((result as any).errorCode).to.be.equal(ErrorCodes.Exception);
    expect((result as any).errorMessage).equals(errorMessage);
  });

  context("getLatestRelease(). When error occurs throws the error for entire command.", function () {
    it("404 status code", async function () {
      // Arrange
      const args: CommandArgs = {
        ...goldenPathArgs,
        args: ["--rollout", "50", "--app", app, deployment, "--token", getFakeParamsForRequest().token],
      };
      const patchCommand = new PatchCommand(args);

      // Act
      const result = patchCommand.execute();

      // Assert
      await expect(result).to.eventually.be.rejected.and.has.property("errorCode", ErrorCodes.NotFound);
    });

    it("400 status code", async function () {
      // Arrange
      const args: CommandArgs = {
        ...goldenPathArgs,
        args: ["--rollout", "50", "--app", app, deployment, "--token", getFakeParamsForRequest().token],
      };
      const patchCommand = new PatchCommand(args);
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}/releases`).reply(400, "errorMessage");

      // Act
      const result = patchCommand.execute();

      // Assert
      await expect(result).to.eventually.be.rejected.and.has.property("errorCode", ErrorCodes.Exception);
    });

    it("400 status code", async function () {
      // Arrange
      const args: CommandArgs = {
        ...goldenPathArgs,
        args: ["--rollout", "50", "--app", app, deployment, "--token", getFakeParamsForRequest().token],
      };
      const patchCommand = new PatchCommand(args);
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}/releases`).reply(400, "errorMessage");

      // Act
      const result = patchCommand.execute();

      // Assert
      await expect(result).eventually.be.rejected.and.has.property("errorCode", ErrorCodes.Exception);
    });

    it("other errors", async function () {
      // Arrange
      const args: CommandArgs = {
        ...goldenPathArgs,
        args: ["--rollout", "50", "--app", app, deployment, "--token", getFakeParamsForRequest().token],
      };
      const patchCommand = new PatchCommand(args);
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}/releases`).reply(401, "errorMessage");

      // Act
      const result = patchCommand.execute();

      // Assert
      await expect(result).to.eventually.be.rejected.and.has.property("errorCode", ErrorCodes.Exception);
    });

    it("releases don't exist", async function () {
      // Arrange
      const args: CommandArgs = {
        ...goldenPathArgs,
        args: ["--rollout", "50", "--app", app, deployment, "--token", getFakeParamsForRequest().token],
      };
      const patchCommand = new PatchCommand(args);
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}/releases`).reply(200, []);

      // Act
      const result = patchCommand.execute();

      // Assert
      await expect(result).to.eventually.be.rejected.and.has.property("errorCode", ErrorCodes.NotFound);
    });
  });
});
