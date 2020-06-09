import { expect, use } from "chai";
import * as Fs from "fs";
import * as Nock from "nock";
import * as Path from "path";
import * as Sinon from "sinon";
import * as Temp from "temp";
import * as ChaiAsPromised from "chai-as-promised";

use(ChaiAsPromised);

import ReleaseBinaryCommand from "../../../../src/commands/distribute/release";
import { CommandArgs, CommandResult, CommandFailedResult } from "../../../../src/util/commandline";

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
  const fakeStoreName = "fakeStoreName";
  const fakeGroupId = "00000000-0000-0000-0000-000000000000";
  const fakeStoreId = "00000000-0000-0000-0000-000000000000";
  const fakeStoreType = "googleplay";
  const fakeStoreTrack = "alpha";
  const fakeHost = "http://localhost:1700";
  const version = "1.0";
  const shortVersion = "1";
  const fakePackageAssetId = "00000000-0000-0000-0000-000000000000";
  const fakeUrlEncodedToken = "%3fsv%3d2019-01-01%26sr%3dc%26si%3d00000000-0000-0000-0000-000000000000%26sig%3d1gqHaz73eHchp8xToO2%252BxXWiljghWIG2XfgkdeAw%252Fhg%253D%26se%3d2020-01-01T01%253A51%253A08Z%26t%3ddistribution";
  const fakeUploadDomain = "http://localhost:1700";
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const releaseFileName = "releaseBinaryFile.apk";
  const releaseNotesFileName = "releaseNotesFile.txt";

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

  describe("when all network requests are successful (group)", () => {
    beforeEach(() => {
      expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
        setupSuccessfulPostUploadResponse(
          setupSuccessfulUploadResponse(
            setupSuccessfulPatchUploadResponse(
              setupSuccessfulCreateReleaseResponse(
                setupSuccessfulAddGroupResponse(setupSuccsessFulGetDistributionGroupResponse(Nock(fakeHost)))
              )
            )
          )
        )
      );
      skippedRequestsScope = setupSuccessfulAbortUploadResponse(Nock(fakeHost));
    });

    it("uploads release with release notes text", async (done) => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);

      // Act
      const command = new ReleaseBinaryCommand(
        getCommandArgs(["-f", releaseFilePath, "-r", releaseNotes, "-g", fakeDistributionGroupName])
      );
      const result = await command.execute();

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      testUploadedFormData();
      done();
    });

    it("uploads release with release notes file", async () => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
      const releaseNotesFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);

      // Act
      const command = new ReleaseBinaryCommand(
        getCommandArgs(["-f", releaseFilePath, "-R", releaseNotesFilePath, "-g", fakeDistributionGroupName])
      );
      const result = await command.execute();

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      testUploadedFormData();
    });
  });

  describe("when all network requests are successful (store)", () => {
    beforeEach(() => {
      expectedRequestsScope = setupSuccessfulGetStoreDetailsResponse(
        setupSuccessfulPostUploadResponse(
          setupSuccessfulUploadResponse(
            setupSuccessfulPatchUploadResponse(
              setupSuccessfulCreateReleaseResponse(setupSuccessfulAddStoreResponse(Nock(fakeHost)), false)
            )
          )
        )
      );
      skippedRequestsScope = setupSuccessfulAbortUploadResponse(Nock(fakeHost));
    });

    it("uploads release with release notes text", async () => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);

      // Act
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-r", releaseNotes, "-s", fakeStoreName]));
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
      const command = new ReleaseBinaryCommand(
        getCommandArgs(["-f", releaseFilePath, "-R", releaseNotesFilePath, "-s", fakeStoreName])
      );
      const result = await command.execute();

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      testUploadedFormData();
    });
  });

  describe("when all network requests are successful (no release notes)", () => {
    beforeEach(() => {
      expectedRequestsScope = setupSuccessfulGetStoreDetailsResponse(
        setupSuccessfulPostUploadResponse(
          setupSuccessfulUploadResponse(setupSuccessfulPatchUploadResponse(setupSuccessfulAddStoreResponse(Nock(fakeHost))))
        )
      );
      skippedRequestsScope = setupSuccessfulAbortUploadResponse(Nock(fakeHost));
    });
    it("uploads release with neither release notes nor file to Google Play Store", async () => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);

      // Act
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-s", fakeStoreName]));
      const result = await command.execute();

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      testUploadedFormData();
    });
  });

  context("build-version", () => {
    const zipFileName = "binary.zip";
    const msiFileName = "binary.msi";
    const pkgFileName = "binary.pkg";
    const dmgFileName = "binary.dmg";
    const buildVersion = "sample-build-version";
    const buildNumber = "sample-build-number";

    describe("when build version specified", () => {
      beforeEach(() => {
        expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
          setupSuccessfulPostUploadResponse(
            setupSuccessfulUploadResponse(
              setupSuccessfulPatchUploadResponse(
                setupSuccessfulAddGroupResponse(setupSuccsessFulGetDistributionGroupResponse(Nock(fakeHost)))
              )
            )
          )
        );
        skippedRequestsScope = setupSuccessfulAbortUploadResponse(Nock(fakeHost));
      });

      it("should return success for zip file", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, zipFileName, releaseFileContent);

        // Act
        const command = new ReleaseBinaryCommand(
          getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName, "-b", buildVersion])
        );
        const result = await command.execute();

        // Assert
        testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
        Sinon.assert.calledWith(postSymbolSpy, Sinon.match({ build_version: buildVersion }));
      });

      it("should return success for msi file", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, msiFileName, releaseFileContent);

        // Act
        const command = new ReleaseBinaryCommand(
          getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName, "-b", buildVersion])
        );
        const result = await command.execute();

        // Assert
        testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
        Sinon.assert.calledWith(postSymbolSpy, Sinon.match({ build_version: buildVersion }));
      });

      it("should return success for pkg file", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, pkgFileName, releaseFileContent);

        // Act
        const command = new ReleaseBinaryCommand(
          getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName, "-b", buildVersion, "-n", buildNumber])
        );
        const result = await command.execute();

        // Assert
        testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
        Sinon.assert.calledWith(postSymbolSpy, Sinon.match({ build_version: buildVersion, build_number: buildNumber }));
      });

      it("should return success for dmg file", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, dmgFileName, releaseFileContent);

        // Act
        const command = new ReleaseBinaryCommand(
          getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName, "-b", buildVersion, "-n", buildNumber])
        );
        const result = await command.execute();

        // Assert
        testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
        Sinon.assert.calledWith(postSymbolSpy, Sinon.match({ build_version: buildVersion, build_number: buildNumber }));
      });
    });

    describe("when validates input arguments", () => {
      beforeEach(() => {
        skippedRequestsScope = Nock(fakeHost);
      });

      it("raises error when zip file uploading and no --build-version specified", async () => {
        // Arrange
        const expectedErrorMessage = "--build-version parameter must be specified when uploading .zip files";

        // Act
        const command = new ReleaseBinaryCommand(getCommandArgs(["-f", zipFileName, "-g", fakeDistributionGroupName]));
        const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

        // Assert
        testFailure(result, expectedErrorMessage, skippedRequestsScope);
      });

      it("raises error when msi file uploading and no --build-version specified", async () => {
        // Arrange
        const expectedErrorMessage = "--build-version parameter must be specified when uploading .msi files";

        // Act
        const command = new ReleaseBinaryCommand(getCommandArgs(["-f", msiFileName, "-g", fakeDistributionGroupName]));
        const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

        // Assert
        testFailure(result, expectedErrorMessage, skippedRequestsScope);
      });

      it("raises error when pkg file uploading and no --build-version specified", async () => {
        // Arrange
        const expectedErrorMessage = "--build-version and --build-number must both be specified when uploading .pkg files";

        // Act
        const command = new ReleaseBinaryCommand(getCommandArgs(["-f", pkgFileName, "-g", fakeDistributionGroupName]));
        const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

        // Assert
        testFailure(result, expectedErrorMessage, skippedRequestsScope);
      });

      it("raises error when pkg file uploading and no --build-number specified", async () => {
        // Arrange
        const expectedErrorMessage = "--build-version and --build-number must both be specified when uploading .pkg files";

        // Act
        const command = new ReleaseBinaryCommand(
          getCommandArgs(["-f", pkgFileName, "-g", fakeDistributionGroupName, "-b", buildVersion])
        );
        const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

        // Assert
        testFailure(result, expectedErrorMessage, skippedRequestsScope);
      });

      it("passes with aab for stores", async () => {
        const command = new ReleaseBinaryCommand(getCommandArgs(["-f", "valid.aab", "-r", "release notes", "--store", fakeStoreName]));
        await expect(command.execute()).to.eventually.be.rejected;
      });

      it("passes with apk for stores", async () => {
        const command = new ReleaseBinaryCommand(getCommandArgs(["-f", "valid.apk", "-r", "release notes", "--store", fakeStoreName]));
        await expect(command.execute()).to.eventually.be.rejected;
      });

      it("passes with ipa for stores", async () => {
        const command = new ReleaseBinaryCommand(getCommandArgs(["-f", "valid.ipa", "-r", "release notes", "--store", fakeStoreName]));
        await expect(command.execute()).to.eventually.be.rejected;
      });
    });
  });

  context("silent", () => {
    describe("when notifying testers by default", () => {
      beforeEach(() => {
        expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
          setupSuccessfulPostUploadResponse(
            setupSuccessfulUploadResponse(
              setupSuccessfulPatchUploadResponse(
                setupSuccessfulCreateReleaseResponse(
                  setupSuccessfulAddGroupResponse(setupSuccsessFulGetDistributionGroupResponse(Nock(fakeHost)))
                )
              )
            )
          )
        );
        skippedRequestsScope = setupSuccessfulAbortUploadResponse(Nock(fakeHost));
      });

      it("should successfully distribute the release", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);

        // Act
        const command = new ReleaseBinaryCommand(
          getCommandArgs(["-f", releaseFilePath, "-r", releaseNotes, "-g", fakeDistributionGroupName])
        );
        const result = await command.execute();

        // Assert
        testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
        testUploadedFormData();
      });
    });

    describe("when notifying testers", () => {
      beforeEach(() => {
        expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
          setupSuccessfulPostUploadResponse(
            setupSuccessfulUploadResponse(
              setupSuccessfulPatchUploadResponse(
                setupSuccessfulCreateReleaseResponse(
                  setupSuccessfulAddGroupResponse(setupSuccsessFulGetDistributionGroupResponse(Nock(fakeHost)))
                )
              )
            )
          )
        );
        skippedRequestsScope = setupSuccessfulAbortUploadResponse(Nock(fakeHost));
      });

      it("should successfully distribute the release", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);

        // Act
        const command = new ReleaseBinaryCommand(
          getCommandArgs(["-f", releaseFilePath, "-r", releaseNotes, "-g", fakeDistributionGroupName, "--no-silent"])
        );
        const result = await command.execute();

        // Assert
        testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
        testUploadedFormData();
      });
    });

    describe("when not notifying testers", () => {
      beforeEach(() => {
        expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
          setupSuccessfulPostUploadResponse(
            setupSuccessfulUploadResponse(
              setupSuccessfulPatchUploadResponse(
                setupSuccessfulCreateReleaseResponse(
                  setupSuccessfulAddGroupResponse(setupSuccsessFulGetDistributionGroupResponse(Nock(fakeHost)), true)
                )
              )
            )
          )
        );
        skippedRequestsScope = setupSuccessfulAbortUploadResponse(Nock(fakeHost));
      });

      it("should successfully distribute the release", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);

        // Act
        const command = new ReleaseBinaryCommand(
          getCommandArgs(["-f", releaseFilePath, "-r", releaseNotes, "-g", fakeDistributionGroupName, "--silent"])
        );
        const result = await command.execute();

        // Assert
        testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
        testUploadedFormData();
      });
    });
  });

  context("mandatory", () => {
    describe("when distributing with mandatory flag set to true", () => {
      beforeEach(() => {
        expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
          setupSuccessfulPostUploadResponse(
            setupSuccessfulUploadResponse(
              setupSuccessfulPatchUploadResponse(
                setupSuccessfulCreateReleaseResponse(
                  setupSuccessfulAddGroupResponse(setupSuccsessFulGetDistributionGroupResponse(Nock(fakeHost)), false, true)
                )
              )
            )
          )
        );
        skippedRequestsScope = setupSuccessfulAbortUploadResponse(Nock(fakeHost));
      });

      it("should successfully distribute the release", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);

        // Act
        const command = new ReleaseBinaryCommand(
          getCommandArgs(["-f", releaseFilePath, "-r", releaseNotes, "-g", fakeDistributionGroupName, "--mandatory"])
        );
        const result = await command.execute();

        // Assert
        testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
        testUploadedFormData();
      });
    });
  });

  describe("when release upload fails", () => {
    beforeEach(() => {
      expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
        setupSuccessfulPostUploadResponse(setupFailedUploadResponse(setupSuccessfulAbortUploadResponse(Nock(fakeHost))))
      );
      skippedRequestsScope = setupSuccessfulCreateReleaseResponse(setupSuccessfulPatchUploadResponse(Nock(fakeHost)));
    });

    it("attempts to abort the upload", async () => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
      const releaseNotesFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);

      // Act
      const command = new ReleaseBinaryCommand(
        getCommandArgs(["-f", releaseFilePath, "-R", releaseNotesFilePath, "-g", fakeDistributionGroupName])
      );
      const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

      // Assert
      testFailure(result, "release binary file uploading failed: HTTP 500 null", expectedRequestsScope, skippedRequestsScope);
    });
  });

  describe("when creating the release fails", () => {
    beforeEach(() => {
      expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
        setupSuccessfulPostUploadResponse(
          setupSuccessfulUploadResponse(setupSuccessfulPatchUploadResponse(setupFailedCreateReleaseResponse(Nock(fakeHost))))
        )
      );

      skippedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(setupSuccessfulAddGroupResponse(Nock(fakeHost)));
    });

    it("does not try to set the release notes for the release", async () => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
      const releaseNotesFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);

      // Act
      const command = new ReleaseBinaryCommand(
        getCommandArgs(["-f", releaseFilePath, "-R", releaseNotesFilePath, "-g", fakeDistributionGroupName])
      );
      const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

      // Assert
      testFailure(result, `failed to set release notes for release ${fakeReleaseId}`, expectedRequestsScope, skippedRequestsScope);
    });
  });

  describe("when getting the distribution group fails", () => {
    beforeEach(() => {
      expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
        setupSuccessfulPostUploadResponse(
          setupSuccessfulUploadResponse(
            setupSuccessfulPatchUploadResponse(
              setupSuccessfulCreateReleaseResponse(setupFailedGetDistributionGroupResponse(Nock(fakeHost)))
            )
          )
        )
      );

      skippedRequestsScope = setupSuccessfulAddGroupResponse(Nock(fakeHost));
    });

    it("does not try to add the group to the release", async () => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
      const releaseNotesFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);

      // Act
      const command = new ReleaseBinaryCommand(
        getCommandArgs(["-f", releaseFilePath, "-R", releaseNotesFilePath, "-g", fakeDistributionGroupName])
      );
      const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

      // Assert
      testFailure(result, `Could not find group ${fakeDistributionGroupName}`, expectedRequestsScope, skippedRequestsScope);
    });
  });

  describe("when adding the group to the distribution group fails", () => {
    beforeEach(() => {
      expectedRequestsScope = setupSuccessfulGetDistributionGroupUsersResponse(
        setupSuccessfulPostUploadResponse(
          setupSuccessfulUploadResponse(
            setupSuccessfulPatchUploadResponse(
              setupSuccessfulCreateReleaseResponse(
                setupSuccsessFulGetDistributionGroupResponse(setupFailedAddGroupResponse(Nock(fakeHost)))
              )
            )
          )
        )
      );
    });

    it("responds with a failed result", async () => {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
      const releaseNotesFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);

      // Act
      const command = new ReleaseBinaryCommand(
        getCommandArgs(["-f", releaseFilePath, "-R", releaseNotesFilePath, "-g", fakeDistributionGroupName])
      );
      const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

      // Assert
      testFailure(result, `Could not find release ${fakeReleaseId}`, expectedRequestsScope);
    });
  });

  describe("when using invalid arguments", () => {
    let releaseFilePath: string;
    let releaseNotesFilePath: string;

    before(() => {
      releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
      releaseNotesFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);
    });

    it("fails if --file is not specified", async () => {
      expect(() => new ReleaseBinaryCommand(getCommandArgs(["-R", releaseNotesFilePath, "-g", fakeDistributionGroupName]))).to.throw;
    });

    it("fails if neither --release-notes nor --release-notes-file is specified", async () => {
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName]));
      await expect(command.execute()).to.eventually.be.rejected;
    });

    it("fails if both --release-notes and --release-notes-file are specified", async () => {
      const command = new ReleaseBinaryCommand(
        getCommandArgs(["-f", releaseFilePath, "-r", releaseNotes, "-R", releaseNotesFilePath, "-g", fakeDistributionGroupName])
      );
      await expect(command.execute()).to.eventually.be.rejected;
    });

    it("fails if neither --group nor --store is specified", async () => {
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-R", releaseNotesFilePath]));
      await expect(command.execute()).to.eventually.be.rejected;
    });

    it("fails if distributing invalid file type to store", async () => {
      const command = new ReleaseBinaryCommand(
        getCommandArgs(["-f", "invalid.ext", "-R", releaseNotesFilePath, "--store", fakeStoreName])
      );
      await expect(command.execute()).to.eventually.be.rejected;
    });

    it("fails if distributing invalid file type to group", async () => {
      const command = new ReleaseBinaryCommand(
        getCommandArgs(["-f", "invalid.aab", "-R", releaseNotesFilePath, "--group", fakeStoreName])
      );
      await expect(command.execute()).to.eventually.be.rejected;
    });

    describe("when publishing to an 'apple' type store", () => {
      beforeEach(() => {
        expectedRequestsScope = setupSuccessfulGetStoreDetailsResponse(Nock(fakeHost), "apple");
      });

      it("fails if neither --release-notes nor --release-notes-file is specified", async () => {
        // Arrange
        const expectedErrorMessage =
          "At least one of '--release-notes' or '--release-notes-file' must be specified when publishing to an Apple store.";

        // Act
        const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-s", fakeStoreName]));
        const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

        // Assert
        testFailure(result, expectedErrorMessage, expectedRequestsScope);
      });
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

  function testFailure(result: CommandFailedResult, errorMessage: string, executionScope: Nock.Scope, skippedScope?: Nock.Scope) {
    expect(result.succeeded).to.eql(false, "Command should fail");
    expect(result.errorMessage).to.eql(errorMessage);
    if (skippedScope) {
      expect(skippedScope.isDone()).to.eql(false, "Skipped scope should not be completed");
    }
    executionScope.done(); // All normal API calls are executed
  }

  function testUploadedFormData() {
    const formData = uploadSpy.lastCall.args[0] as string;
    expect(typeof formData).to.eql("string", "Form Data should be string");
    expect(formData).to.have.string(releaseFileContent, "Release file content should be sent");
    expect(formData).to.have.string('name="ipa"', "There should be 'ipa' field in the form data");
    expect(formData).to.have.string(`filename="${releaseFileName}"`, "Release file name is expected");
  }

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "release"],
      commandPath: "FAKE",
    };
  }

  function setupSuccessfulGetDistributionGroupUsersResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope
      .get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}/members`)
      .reply(200, (uri: any, requestBody: any) => {
        return [
          {
            /* Single user, fields are not used */
          },
        ];
      });
  }

  function setupSuccessfulPostUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.post(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/uploads/releases`).reply(201, (uri: any, requestBody: any) => {
      postSymbolSpy(requestBody);
      return {
        upload_id: fakeReleaseUploadingId,
        upload_url: fakeHost + fakeUploadUrl,
        package_asset_id: fakePackageAssetId,
        url_encoded_token: fakeUrlEncodedToken,
        upload_domain: fakeUploadDomain,
        id: fakeId,
      };
    });
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
    return nockScope
      .patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads/${fakeReleaseUploadingId}`, {
        status: "committed",
      })
      .reply(200, (uri: any, requestBody: any) => {
        patchSymbolSpy(requestBody);
        return {
          release_url: fakeReleaseUrl,
        };
      });
  }

  function setupSuccessfulAbortUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope
      .patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads/${fakeReleaseUploadingId}`, {
        status: "aborted",
      })
      .reply(200, (uri: any, requestBody: any) => {
        abortSymbolSpy(requestBody);
        return {};
      });
  }

  function setupSuccessfulCreateReleaseResponse(nockScope: Nock.Scope, optionalReleaseNotes = true): Nock.Scope {
    return nockScope
      .put(
        `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`,
        optionalReleaseNotes ? { release_notes: releaseNotes } : undefined
      )
      .reply(200, (uri: any, requestBody: any) => {
        distributeSpy(requestBody);
        return {
          version,
          short_version: shortVersion,
        };
      });
  }

  function setupFailedCreateReleaseResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope
      .put(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`, {
        release_notes: releaseNotes,
      })
      .reply(404);
  }

  function setupSuccessfulAddGroupResponse(nockScope: Nock.Scope, silent = false, mandatory = false): Nock.Scope {
    const postAddReleaseGroupDestinationUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}/groups`;
    const expectedBody = {
      id: fakeGroupId,
      mandatory_update: mandatory,
      notify_testers: !silent,
    };

    return nockScope.post(postAddReleaseGroupDestinationUrl, expectedBody).reply(201, {
      id: fakeGroupId,
      mandatory_update: mandatory,
      notify_testers: !silent,
    });
  }

  function setupSuccessfulGetStoreDetailsResponse(nockScope: Nock.Scope, storeType: string = fakeStoreType): Nock.Scope {
    const getDistributionStoresUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_stores/${fakeStoreName}`;

    return nockScope.get(getDistributionStoresUrl).reply(200, {
      id: fakeStoreId,
      name: fakeStoreName,
      type: storeType,
      track: fakeStoreTrack,
    });
  }

  function setupSuccessfulAddStoreResponse(nockScope: Nock.Scope): Nock.Scope {
    const postAddReleaseStoreDestinationUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}/stores`;
    const expectedBody = {
      id: fakeStoreId,
    };

    return nockScope.post(postAddReleaseStoreDestinationUrl, expectedBody).reply(201, {
      id: fakeStoreId,
    });
  }

  function setupFailedAddGroupResponse(nockScope: Nock.Scope, silent = false, mandatory = false): Nock.Scope {
    const postAddReleaseGroupDestinationUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}/groups`;
    const expectedBody = {
      id: fakeGroupId,
      mandatory_update: mandatory,
      notify_testers: !silent,
    };

    return nockScope.post(postAddReleaseGroupDestinationUrl, expectedBody).reply(404);
  }

  function setupSuccsessFulGetDistributionGroupResponse(nockScope: Nock.Scope): Nock.Scope {
    const getDistributionGroupUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}`;

    return nockScope.get(getDistributionGroupUrl).reply(200, {
      id: fakeGroupId,
      name: fakeDistributionGroupName,
      dismay_name: "my group",
      origin: "appcenter",
      is_public: false,
    });
  }

  function setupFailedGetDistributionGroupResponse(nockScope: Nock.Scope): Nock.Scope {
    const getDistributionGroupUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}`;

    return nockScope.get(getDistributionGroupUrl).reply(404);
  }
});
