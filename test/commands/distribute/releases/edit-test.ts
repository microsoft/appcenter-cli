import { expect } from "chai";
import * as Nock from "nock";
import * as Temp from "temp";
import * as _ from "lodash";

import EditReleaseCommand from "../../../../src/commands/distribute/releases/edit";
import { CommandArgs, CommandResult, CommandFailedResult } from "../../../../src/util/commandline";

Temp.track();

describe("distribute releases edit command", async () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeReleaseId = "5";
  const fakeHost = "http://localhost:1700";
  const releaseIdOption = "--release-id";

  before(() => {
    Nock.disableNetConnect();
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  after(() => {
    Nock.enableNetConnect();
  });

  context("completes successfully", () => {
    it("if enable release", async () => {
      // Arrange
      const executionScope = _.flow(setupReleaseDetailsResponse, setupUpdateReleaseResponse)(Nock(fakeHost));

      // Act
      const command = new EditReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId, "--state enabled"]));
      const result = await command.execute();

      testCommandSuccess(result, executionScope);
    });

    it("if disable release", async () => {
      // Arrange
      const executionScope = _.flow(setupReleaseDetailsResponse, setupUpdateReleaseResponse)(Nock(fakeHost));

      // Act
      const command = new EditReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId, "--state disabled"]));
      const result = await command.execute();

      testCommandSuccess(result, executionScope);
    });

    it("update release notes", async () => {
      // Arrange
      const executionScope = _.flow(setupReleaseDetailsResponse, setupUpdateReleaseResponse)(Nock(fakeHost));

      // Act
      const command = new EditReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId, "--release-notes 'fake release notes'"]));
      const result = await command.execute();

      testCommandSuccess(result, executionScope);
    });
  });

  context("failed", () => {
    it("if --release-id option wasn't specified", async () => {
      // Arrange
      let errorMessage: string;
      const expectedErrorMessage = "Missing required option -r / --release-id";

      let command;
      // Act
      try {
        command = new EditReleaseCommand(getCommandArgs([releaseIdOption]));
      } catch (e) {
        errorMessage = e.message;
      }

      // Assert
      expect(command).to.eql(undefined);
      expect(errorMessage).to.eql(expectedErrorMessage);
    });

    it("if --release-id option value is not valid", async () => {
      // Arrange
      const expectedErrorMessage = "notanumber is not a valid release id";

      // Act
      const command = new EditReleaseCommand(getCommandArgs([releaseIdOption, "notanumber", "--state disabled"]));
      const result = await command.execute();

      // Assert
      expect((result as CommandFailedResult).errorMessage).to.eql(expectedErrorMessage);
    });

    it("if state option value is invalid", async () => {
      // Arrange
      const expectedErrorMessage = `'--state' can be 'enabled' or 'disabled'`;

      // Act
      const command = new EditReleaseCommand(getCommandArgs([releaseIdOption, "1", "--state invalidvalue"]));
      const result = await command.execute();

      // Assert
      expect((result as CommandFailedResult).errorMessage).to.eql(expectedErrorMessage);
    });

    it("if release does not exist", async () => {
      // Arrange
      const expectedErrorMessage = `release ${fakeReleaseId} doesn't exist`;
      const executionScope = setupReleaseDetailsNotFoundResponse(Nock(fakeHost));

      // Act
      const command = new EditReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId, "disabled"]));
      const result = await command.execute();

      // Assert
      expect((result as CommandFailedResult).errorMessage).to.eql(expectedErrorMessage);
      testCommandFailure(executionScope);
    });

    it("if failed to load release details", async () => {
      // Arrange
      const expectedErrorMessage = "failed to load release details";
      const executionScope = setupReleaseDetailsServiceUnavailableResponse(Nock(fakeHost));

      // Act
      const command = new EditReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId, "--state disabled"]));
      const result = await command.execute();

      // Assert
      expect((result as CommandFailedResult).errorMessage).to.eql(expectedErrorMessage);
      testCommandFailure(executionScope);
    });

    it("if failed to update release state", async () => {
      // Arrange
      const expectedErrorMessage = "failed to disable the release";
      const executionScope = _.flow(setupReleaseDetailsResponse, setupUpdateReleaseServiceUnavailableResponse)(Nock(fakeHost));

      // Act
      const command = new EditReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId, "--state disabled"]));
      const result = await command.execute();

      // Assert
      expect((result as CommandFailedResult).errorMessage).to.eql(expectedErrorMessage);
      testCommandFailure(executionScope);
    });

    it("if file and release notes both provided", async () => {
      // Arrange
      const expectedErrorMessage = "'--release-notes' and '--release-notes-file' switches are mutually exclusive";
      const executionScope = _.flow(setupReleaseDetailsResponse, setupUpdateReleaseServiceUnavailableResponse)(Nock(fakeHost));

      // Act
      const command = new EditReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId, "--relese-notes anytext --release-notes-file some/fake/path"]));
      const result = await command.execute();

      // Assert
      expect((result as CommandFailedResult).errorMessage).to.eql(expectedErrorMessage);
      testCommandFailure(executionScope);
    });
  });

  function testCommandSuccess(result: CommandResult, executionScope: Nock.Scope, abortScope?: Nock.Scope) {
    expect(result.succeeded).to.eql(true, "Command should be successfully completed");
    if (abortScope) {
      expect(abortScope.isDone()).to.eql(false, "Unexpected requests were made");
    }
    executionScope.done(); // All normal API calls are executed
  }

  function testCommandFailure(executionScope: Nock.Scope, abortScope?: Nock.Scope) {
    if (abortScope) {
      expect(abortScope.isDone()).to.eql(false, "Unexpected requests were made");
    }
    executionScope.done(); // All normal API calls are executed
  }

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "releases", "edit"],
      commandPath: "FAKE_COMMAND_PATH",
    };
  }

  function setupReleaseDetailsNotFoundResponse(nockScope: Nock.Scope) {
    return nockScope.get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`).reply(404, {
      error: {
        code: "NotFound",
        message: `Could not find release with id ${fakeReleaseId}`,
      },
    });
  }

  function setupReleaseDetailsResponse(nockScope: Nock.Scope) {
    return nockScope.get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`).reply(200, {
      shortVersion: "1.1",
      version: "1.1",
    });
  }

  function setupReleaseDetailsServiceUnavailableResponse(nockScope: Nock.Scope) {
    return nockScope.get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`).reply(400);
  }

  function setupUpdateReleaseServiceUnavailableResponse(nockScope: Nock.Scope) {
    return nockScope.put(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`).reply(400);
  }

  function setupUpdateReleaseResponse(nockScope: Nock.Scope) {
    return nockScope.put(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`).reply(200, {
      shortVersion: "1.1",
      version: "1.1",
    });
  }
});
