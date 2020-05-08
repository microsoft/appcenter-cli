import { expect } from "chai";
import * as Nock from "nock";
import * as Temp from "temp";
import * as _ from "lodash";
import * as Path from "path";
import * as Fs from "fs";

import EditNotesReleaseCommand from "../../../../src/commands/distribute/releases/edit-notes";
import { CommandArgs, CommandResult, CommandFailedResult } from "../../../../src/util/commandline";

Temp.track();

describe("distribute releases edit-notes command", async () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeReleaseId = "5";
  const fakeHost = "http://localhost:1700";
  const releaseIdOption = "--release-id";
  const releaseNotesFileName = "releaseNotesFile.txt";
  const releaseNotes = "Release Notes for v1";
  let tmpFolderPath: string;

  before(() => {
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    tmpFolderPath = Temp.mkdirSync("editNotesTest");
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  after(() => {
    Nock.enableNetConnect();
  });

  function createFile(folderPath: string, fileName: string, fileContent: string): string {
    const finalPath = Path.join(folderPath, fileName);
    Fs.writeFileSync(finalPath, fileContent);
    return finalPath;
  }

  context("completes successfully", () => {
    it("if upload edit notes from parameter", async () => {
      // Arrange
      const executionScope = _.flow(setupReleaseDetailsResponse, setupUpdateReleaseResponse)(Nock(fakeHost));

      // Act
      const command = new EditNotesReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId, "--release-notes", releaseNotes]));
      const result = await command.execute();

      testCommandSuccess(result, executionScope);
    });

    it("if upload edit notes from file", async () => {
      // Arrange
      const executionScope = _.flow(setupReleaseDetailsResponse, setupUpdateReleaseResponse)(Nock(fakeHost));
      const releaseFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);

      // Act
      const command = new EditNotesReleaseCommand(
        getCommandArgs([releaseIdOption, fakeReleaseId, "--release-notes-file", releaseFilePath])
      );
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
        command = new EditNotesReleaseCommand(getCommandArgs(["--release-notes", releaseNotes]));
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
      const command = new EditNotesReleaseCommand(getCommandArgs([releaseIdOption, "notanumber", "--release-notes", releaseNotes]));
      const result = await command.execute();

      // Assert
      expect((result as CommandFailedResult).errorMessage).to.eql(expectedErrorMessage);
    });

    it("if failed to load release details", async () => {
      // Arrange
      const expectedErrorMessage = "failed to load release details";
      const executionScope = setupReleaseDetailsServiceUnavailableResponse(Nock(fakeHost));

      // Act
      const command = new EditNotesReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId, "--release-notes", releaseNotes]));
      const result = await command.execute();

      // Assert
      expect((result as CommandFailedResult).errorMessage).to.eql(expectedErrorMessage);
      testCommandFailure(executionScope);
    });

    it("if release does not exist", async () => {
      // Arrange
      const expectedErrorMessage = `release ${fakeReleaseId} doesn't exist`;
      const executionScope = setupReleaseDetailsNotFoundResponse(Nock(fakeHost));

      // Act
      const command = new EditNotesReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId, "--release-notes", releaseNotes]));
      const result = await command.execute();

      // Assert
      expect((result as CommandFailedResult).errorMessage).to.eql(expectedErrorMessage);
      testCommandFailure(executionScope);
    });

    it("if --release-notes and --release-notes-file both specified", async () => {
      // Arrange
      const expectedErrorMessage = "'--release-notes' and '--release-notes-file' parameters are mutually exclusive";
      const releaseFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);

      // Act
      const command = new EditNotesReleaseCommand(
        getCommandArgs([releaseIdOption, fakeReleaseId, "--release-notes", releaseNotes, "--release-notes-file", releaseFilePath])
      );
      const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

      // Assert
      testFailure(result, expectedErrorMessage);
    });

    it("if --release-notes and --release-notes-file both not specified", async () => {
      // Arrange
      const expectedErrorMessage = "One of '--release-notes' and '--release-notes-file' is required";

      // Act
      const command = new EditNotesReleaseCommand(getCommandArgs([releaseIdOption, fakeReleaseId]));
      const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

      // Assert
      testFailure(result, expectedErrorMessage);
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

  function setupUpdateReleaseResponse(nockScope: Nock.Scope) {
    return nockScope.put(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`).reply(200, {
      shortVersion: "1.1",
      version: "1.1",
    });
  }

  function testFailure(result: CommandFailedResult, errorMessage: string) {
    expect(result.succeeded).to.eql(false, "Command should fail");
    expect(result.errorMessage).to.eql(errorMessage);
  }
});
