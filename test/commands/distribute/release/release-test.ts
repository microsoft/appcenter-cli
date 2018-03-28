import { expect, use } from "chai";
import * as Fs from "fs";
import * as Nock from "nock";
import * as Path from "path";
import * as Sinon from "sinon";
import * as Temp from "temp";
import * as ChaiAsPromised from "chai-as-promised";

use(ChaiAsPromised);

import ReleaseBinaryCommand from "../../../../src/commands/distribute/release";
import { CommandArgs, CommandResult } from "../../../../src/util/commandline";

Temp.track();

describe("release command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeReleaseUploadingId = "fakeReleaseUploadingId";
  const fakeUploadUrl = "/upload/here";
  const fakeReleaseId = "1";
  const fakeReleaseUrl = "/fake/release/url/" + fakeReleaseId;
  const fakeDistributionGroupName = "fakeDistributionGroupName";
  /* tslint:disable-next-line:no-http-string */
  const fakeHost = "http://localhost:1700";
  const version = "1.0";
  const shortVersion = "1";

  const releaseFileName = "releaseBinaryFile";
  const releaseNotesFileName = "releaseNotesFile";

  const releaseFileContent = "Hello World!";

  const releaseNotes = "Release Notes for v1";

  let tmpFolderPath: string;

  let uploadSpy: Sinon.SinonSpy;
  let postSymbolSpy: Sinon.SinonSpy;
  let patchSymbolSpy: Sinon.SinonSpy;
  let abortSymbolSpy: Sinon.SinonSpy;
  let distributeSpy: Sinon.SinonSpy;

  let expectedRequestsScope: Nock.Scope;
  let skippedRequestsScope: Nock.Scope;

  before(() => {
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    tmpFolderPath = Temp.mkdirSync("releaseTest");
    uploadSpy = Sinon.spy();
    postSymbolSpy = Sinon.spy();
    patchSymbolSpy = Sinon.spy();
    abortSymbolSpy = Sinon.spy();
    distributeSpy = Sinon.spy();
  });

  describe("when all network requests are successful", () => {
    beforeEach(() => {
        expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
          setupSuccessfulPostUploadResponse(
            setupSuccessfulUploadResponse(
              setupSuccessfulPatchUploadResponse(
                setupSuccessfulDistributeReleaseResponse(
                  Nock(fakeHost))))));
        skippedRequestsScope = setupSuccessfulAbortUploadResponse(Nock(fakeHost));
    });

    it("uploads release with release notes text", async () => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);

      // Act
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-r", releaseNotes, "-g", fakeDistributionGroupName]));
      const result = await command.execute();

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      testUploadedFormData();
    });

    it("uploads release with release notes file", async () => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
      const releaseNotesFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);

      // Act
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-R", releaseNotesFilePath, "-g", fakeDistributionGroupName]));
      const result = await command.execute();

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      testUploadedFormData();
    });

  });

  describe("when release upload fails", () => {
    beforeEach(() => {
        expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
          setupSuccessfulPostUploadResponse(
            setupFailedUploadResponse(
              setupSuccessfulAbortUploadResponse(
                  Nock(fakeHost)))));
        skippedRequestsScope = setupSuccessfulDistributeReleaseResponse(
          setupSuccessfulPatchUploadResponse(Nock(fakeHost)));
    });

    it("attempts to abort the upload", async () => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
      const releaseNotesFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);

      // Act
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-R", releaseNotesFilePath, "-g", fakeDistributionGroupName]));
      const result = await expect(command.execute()).to.eventually.be.rejected;

      // Assert
      testUploadFailure(result, expectedRequestsScope, skippedRequestsScope);
    });
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

  function testCommandSuccess(result: CommandResult, executionScope: Nock.Scope, abortScope: Nock.Scope) {
    expect(result.succeeded).to.eql(true, "Command should be successfully completed");
    expect(abortScope.isDone()).to.eql(false, "Upload should not be aborted");
    executionScope.done(); // All normal API calls are executed
  }

  function testUploadFailure(result: CommandResult, executionScope: Nock.Scope, skippedScope: Nock.Scope) {
    expect(result.succeeded).to.eql(false, "Command should fail");
    expect(skippedScope.isDone()).to.eql(false, "Upload should not be completed");
    executionScope.done(); // All normal API calls are executed
  }

  function testUploadedFormData() {
    const formData = uploadSpy.lastCall.args[0] as string;
    expect(typeof(formData)).to.eql("string", "Form Data should be string");
    expect(formData).to.have.string(releaseFileContent, "Release file content should be sent");
    expect(formData).to.have.string('name="ipa"', "There should be 'ipa' field in the form data");
    expect(formData).to.have.string(`filename="${releaseFileName}"`, "Release file name is expected");
  }

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "release"],
      commandPath: "FAKE"
    };
  }

  function setupSuccessfulGetDistributionGroupUsersResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}/members`)
      .reply(200, ((uri: any, requestBody: any) => {
        return [{ /* Single user, fields are not used */}];
      }));
  }

  function setupSuccessfulPostUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.post(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads`)
      .reply(201, ((uri: any, requestBody: any) => {
        postSymbolSpy(requestBody);
        return {
          upload_id: fakeReleaseUploadingId,
          upload_url: fakeHost + fakeUploadUrl
        };
      }));
  }

  function setupSuccessfulUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.post(fakeUploadUrl).reply(200, (uri: any, requestBody: any) => {
      uploadSpy(requestBody);
    });
  }

  function setupFailedUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.post(fakeUploadUrl).reply(500, (uri: any, requestBody: any) => {
      uploadSpy(requestBody);
    });
  }

  function setupSuccessfulPatchUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads/${fakeReleaseUploadingId}`, {
      status: "committed"
    }).reply(200, ((uri: any, requestBody: any) => {
      patchSymbolSpy(requestBody);
      return {
        release_url: fakeReleaseUrl
      };
    }));
  }

  function setupSuccessfulAbortUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads/${fakeReleaseUploadingId}`, {
      status: "aborted"
    }).reply(200, ((uri: any, requestBody: any) => {
      abortSymbolSpy(requestBody);
      return { };
    }));
  }

  function setupSuccessfulDistributeReleaseResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`, {
      distribution_group_name: fakeDistributionGroupName,
      release_notes: releaseNotes
    }).reply(200, ((uri: any, requestBody: any) => {
      distributeSpy(requestBody);
      return {
        version,
        short_version: shortVersion
      };
    }));
  }
});
