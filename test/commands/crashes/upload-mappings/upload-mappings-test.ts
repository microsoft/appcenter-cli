import { expect, use } from "chai";
import * as Fs from "fs";
import * as _ from "lodash";
import * as Nock from "nock";
import * as Path from "path";
import * as Sinon from "sinon";
import * as Temp from "temp";
import * as ChaiAsPromised from "chai-as-promised";
import * as MockRequire from "mock-require";

use(ChaiAsPromised);

// Mocking AzureBlobUploadHelper
import AzureBlobUploadHelperMock from "../lib/azure-blob-uploader-helper-mock";
MockRequire("../../../../src/commands/crashes/lib/azure-blob-upload-helper", {
  default: AzureBlobUploadHelperMock
});
import UploadMappingsCommand from "../../../../src/commands/crashes/upload-mappings";
MockRequire.stopAll();

import { CommandArgs, CommandResult } from "../../../../src/util/commandline";

Temp.track();

describe("upload-mappings command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeSymbolUploadingId = "fakeSymbolUploadingId";
  const fakeUploadUrl = "/upload/here";
  /* tslint:disable-next-line:no-http-string */
  const fakeHost = "http://localhost:1700";
  const fakeFullUploadUrl = fakeHost + fakeUploadUrl;

  const mappingsFileName = "mapping.txt";

  const mappingsFileContent = "Mappings";

  let tmpFolderPath: string;

  let postSymbolSpy: Sinon.SinonSpy;
  let patchSymbolSpy: Sinon.SinonSpy;
  let abortSymbolUploadSpy: Sinon.SinonSpy;

  let expectedRequestsScope: Nock.Scope;
  let skippedRequestsScope: Nock.Scope;

  before(() => {
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    tmpFolderPath = Temp.mkdirSync("uploadMappingsTest");
    postSymbolSpy = Sinon.spy();
    patchSymbolSpy = Sinon.spy();
    abortSymbolUploadSpy = Sinon.spy();
  });

  describe("input validation", () => {
    it("no required parameters provided", async () => {
      // Act/Assert
      await expect(executeUploadCommand([])).to.eventually.be.rejected;
    });
    it("only mapping provided", async () => {
      // Arrange
      const mappingsPath = await createMappingsFile(mappingsFileContent);

      // Act/Assert
      await expect(executeUploadCommand(["-m", mappingsPath])).to.eventually.be.rejected;
    });
    it("only version name provided", async () => {
      // Act/Assert
      await expect(executeUploadCommand(["-n", "1.0"])).to.eventually.be.rejected;
    });
    it("only version code provided", async () => {
      // Act/Assert
      await expect(executeUploadCommand(["-c", "1"])).to.eventually.be.rejected;
    });
    it("only mapping and version name provided", async () => {
      // Arrange
      const mappingsPath = await createMappingsFile(mappingsFileContent);

      // Act/Assert
      await expect(executeUploadCommand(["-m", mappingsPath, "-n", "1.0"])).to.eventually.be.rejected;
    });
    it("only mapping and version code provided", async () => {
      // Arrange
      const mappingsPath = await createMappingsFile(mappingsFileContent);

      // Act/Assert
      await expect(executeUploadCommand(["-m", mappingsPath, "-c", "1"])).to.eventually.be.rejected;
    });

    it("only version name and version code provided", async () => {
      // Act/Assert
      await expect(executeUploadCommand(["-n", "1.0", "-c", "1"])).to.eventually.be.rejected;
    });

    it("non-existent mapping file provided", async () => {
      // Act/Assert
      await expect(executeUploadCommand(["-m", "test"])).to.eventually.be.rejected;
    });

    it("invalid mapping file provided", async () => {
      // Arrange
      const mappingsPath = await createMappingsFile(mappingsFileContent, "test.test");
      // Act/Assert
      await expect(executeUploadCommand(["-m", mappingsPath])).to.eventually.be.rejected;
    });

    it("negative version code provided", async () => {
      // Arrange
      const mappingsPath = await createMappingsFile(mappingsFileContent, "test.test");
      // Act/Assert
      await expect(executeUploadCommand(["-m", mappingsPath, "-n", "1.0", "-c", "-1"])).to.eventually.be.rejected;
    });

    it("zero version code provided", async () => {
      // Arrange
      const mappingsPath = await createMappingsFile(mappingsFileContent, "test.test");
      // Act/Assert
      await expect(executeUploadCommand(["-m", mappingsPath, "-n", "1.0", "-c", "0"])).to.eventually.be.rejected;
    });
  });

  describe("when AndroidProguard network requests are successful", () => {
    beforeEach(() => {
      expectedRequestsScope = _.flow(setupSuccessfulAndroidProguardPatchUploadResponse, setupSuccessfulAndroidProguardPostUploadResponse)(Nock(fakeHost));
      skippedRequestsScope = setupSuccessfulAndroidProguardAbortUploadResponse(Nock(fakeHost));
    });

    it("uploads mapping.txt", async () => {
      // Arrange
      const mappingsPath = await createMappingsFile(mappingsFileContent);

      // Act
      const result = await executeUploadCommand(["-m", mappingsPath, "-n", "1.0", "-c", "1"]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      const [url, uploadedZipPath] = AzureBlobUploadHelperMock.getUploadedArtifactUrlAndPath();
      expect(url).to.eql(fakeFullUploadUrl, `mapping.txt file should be uploaded to ${fakeFullUploadUrl}`);
      expect(uploadedZipPath).to.eql(mappingsPath, "mapping.txt file should be passed as it is");
    });

    it("uploads test.txt", async () => {
      // Arrange
      const mappingsPath = await createMappingsFile(mappingsFileContent, "test.txt");

      // Act
      const result = await executeUploadCommand(["-m", mappingsPath, "-n", "1.0", "-c", "1"]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      const [url, uploadedZipPath] = AzureBlobUploadHelperMock.getUploadedArtifactUrlAndPath();
      expect(url).to.eql(fakeFullUploadUrl, `test.txt file should be uploaded to ${fakeFullUploadUrl}`);
      expect(uploadedZipPath).to.eql(mappingsPath, "test.txt file should be passed as it is");
    });
  });

  describe("when AndroidProguard upload fails", () => {
    before(() => {
      AzureBlobUploadHelperMock.throwOnUpload = true;
    });

    beforeEach(() => {
        expectedRequestsScope = _.flow(setupSuccessfulAndroidProguardAbortUploadResponse, setupSuccessfulAndroidProguardPostUploadResponse)(Nock(fakeHost));
        skippedRequestsScope = setupSuccessfulAndroidProguardPatchUploadResponse(Nock(fakeHost));
    });

    it("aborts the symbol uploading", async () => {
      // Arrange
      const mappingsPath = await createMappingsFile(mappingsFileContent);

      // Act
      const result = await expect(executeUploadCommand(["-m", mappingsPath, "-n", "1.0", "-c", "1"])).to.eventually.be.rejected;

      // Assert
      expect(result.succeeded).to.eql(false, "Command should fail");
      expect(skippedRequestsScope.isDone()).to.eql(false, "Upload should not be completed");
      expectedRequestsScope.done(); // All normal API calls are executed
    });

    after(() => {
      AzureBlobUploadHelperMock.throwOnUpload = false;
    });
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  after(() => {
    Nock.enableNetConnect();
  });

  async function executeUploadCommand(args: string[]): Promise<CommandResult> {
    const uploadSymbolsCommand = new UploadMappingsCommand(getCommandArgs(args));
    return await uploadSymbolsCommand.execute();
  }

  function testCommandSuccess(result: CommandResult, executionScope: Nock.Scope, abortScope: Nock.Scope) {
      expect(result.succeeded).to.eql(true, "Command should be successfully completed");
      expect(abortScope.isDone()).to.eql(false, "Upload should not be aborted");
      executionScope.done(); // All normal API calls are executed
  }

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["crashes", "upload-mappings"],
      commandPath: "FAKE"
    };
  }

  function createMappingsFile(content: string, fileName: string = mappingsFileName): string {
    // creating a test mappings file
    const mappingsFilePath = Path.join(tmpFolderPath, fileName);
    Fs.writeFileSync(mappingsFilePath, content);
    return mappingsFilePath;
  }

  function setupSuccessfulAndroidProguardPostUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.post(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/symbol_uploads`, {
      symbol_type: "AndroidProguard", file_name: /.+\.txt/, build: "1", version: "1.0"
    }).reply(200, ((uri: any, requestBody: any) => {
      postSymbolSpy(requestBody);
      return {
        expiration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        symbol_upload_id: fakeSymbolUploadingId,
        upload_url: fakeHost + fakeUploadUrl
      };
    }));
  }

  function setupSuccessfulAndroidProguardPatchUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/symbol_uploads/${fakeSymbolUploadingId}`, {
      status: "committed"
    }).reply(200, ((uri: any, requestBody: any) => {
      patchSymbolSpy(requestBody);
      return {
        origin: "User",
        status: "committed",
        symbol_type: "AndroidProguard",
        symbol_upload_id: fakeSymbolUploadingId,
        symbols: new Array()
      };
    }));
  }

  function setupSuccessfulAndroidProguardAbortUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/symbol_uploads/${fakeSymbolUploadingId}`, {
      status: "aborted"
    }).reply(200, ((uri: any, requestBody: any) => {
      abortSymbolUploadSpy(requestBody);
      return {
        origin: "User",
        status: "aborted",
        symbol_type: "AndroidProguard",
        symbol_upload_id: fakeSymbolUploadingId,
        symbols: new Array()
      };
    }));
  }

});
