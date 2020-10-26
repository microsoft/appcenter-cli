import * as Nock from "nock";
import CodePushAddCommand from "../../../../src/commands/codepush/deployment/add";
import { CommandArgs, CommandFailedResult, ErrorCodes } from "../../../../src/util/commandline";
import { expect } from "chai";

describe("CodePush deployment add tests", () => {
  const app = "bogus/NameApp";
  const deployment = "bogusDeployment";
  const args: CommandArgs = {
    args: ["--app", app, deployment],
    command: ["codepush", "deployment", "add"],
    commandPath: "fake/path",
  };

  it("should create the deployment", async function () {
    // Arrange
    const addCommand = new CodePushAddCommand(args);
    Nock("https://api.appcenter.ms/").post(`/v0.1/apps/${app}/deployments`).query(true).reply(201, {});

    // Act
    const result = await addCommand.execute();

    // Assert
    expect(result.succeeded).to.be.true;
  });

  it("should output error when it fails with 404", async function () {
    // Arrange
    const addCommand = new CodePushAddCommand(args);
    Nock("https://api.appcenter.ms/").post(`/v0.1/apps/${app}/deployments`).query(true).reply(404, {});

    // Act
    const result = await addCommand.execute();

    // Assert
    expect((result as CommandFailedResult).errorCode).to.be.equal(ErrorCodes.NotFound);
    expect((result as CommandFailedResult).errorMessage).contains("does not exist. Please double check the name");
  });

  it("should output error when it fails with 409", async function () {
    // Arrange
    const addCommand = new CodePushAddCommand(args);
    Nock("https://api.appcenter.ms/").post(`/v0.1/apps/${app}/deployments`).query(true).reply(409, {});

    // Act
    const result = await addCommand.execute();

    // Assert
    expect((result as CommandFailedResult).errorCode).to.be.equal(ErrorCodes.Exception);
    expect((result as CommandFailedResult).errorMessage).contains("already exists");
  });

  it("should output error when it fails with another error", async function () {
    // Arrange
    const addCommand = new CodePushAddCommand(args);
    const errorMessage = "Some error message";
    Nock("https://api.appcenter.ms/").post(`/v0.1/apps/${app}/deployments`).query(true).reply(405, errorMessage);

    // Act
    const result = await addCommand.execute();

    // Assert
    expect((result as CommandFailedResult).errorCode).to.be.equal(ErrorCodes.Exception);
    expect((result as CommandFailedResult).errorMessage).to.be.equal(errorMessage);
  });
});
