import * as JsZip from "jszip";
import { expect, use } from "chai";
import * as Fs from "fs";
import * as Pfs from "../../../../src/util/misc/promisfied-fs";
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
import UploadSymbolsCommand from "../../../../src/commands/crashes/upload-symbols";
MockRequire.stopAll();

import { CommandArgs, CommandResult } from "../../../../src/util/commandline";

Temp.track();

describe("upload-symbols command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeSymbolUploadingId = "fakeSymbolUploadingId";
  const fakeUploadUrl = "/upload/here";
  /* tslint:disable-next-line:no-http-string */
  const fakeHost = "http://localhost:1700";
  const fakeFullUploadUrl = fakeHost + fakeUploadUrl;

  const symbolsFile1Name = "symbolsFile1";
  const symbolsFile2Name = "symbolsFile2";
  const randomFileName = "randomFile";
  const dSymFolder1Name = "dsymFolder1.dSYM";
  const dSymFolder2Name = "dsymFolder2.dSYM";
  const dSymParentFolderName = "hereBeTheDsyms";
  const xcArchiveFolderName = "test.xcarchive";
  const mappingsFileName = "testMappingsFile.map";

  const symbolsFileContent = "Hello World!";
  const randomFileContent = "Random File";
  const mappingsFileContent = "Mappings";
  const alternativeMappingsFileContent = "Alternative Mappings";

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
    tmpFolderPath = Temp.mkdirSync("uploadSymbolsTest");
    postSymbolSpy = Sinon.spy();
    patchSymbolSpy = Sinon.spy();
    abortSymbolUploadSpy = Sinon.spy();
  });

  describe("when Breakpad network requests are successful", () => {
    beforeEach(() => {
      expectedRequestsScope = _.flow(setupSuccessfulBreakpadPatchUploadResponse, setupSuccessfulBreakpadPostUploadResponse)(Nock(fakeHost));
      skippedRequestsScope = setupSuccessfulBreakpadAbortUploadResponse(Nock(fakeHost));
    });

    it("uploads ZIP with symbols", async () => {
      const zipPath = await createZipWithFile();

      const result = await executeUploadCommand(["-b", zipPath]);

      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      const [url, uploadedZipPath] = AzureBlobUploadHelperMock.getUploadedArtifactUrlAndPath();
      expect(url).to.eql(fakeFullUploadUrl, `ZIP file should be uploaded to ${fakeFullUploadUrl}`);
      expect(uploadedZipPath).to.eql(zipPath, "Zip file should be passed as it is");
    });
  });

  describe("when Apple network requests are successful", () => {
    beforeEach(() => {
      expectedRequestsScope = _.flow(setupSuccessfulApplePatchUploadResponse, setupSuccessfulApplePostUploadResponse)(Nock(fakeHost));
      skippedRequestsScope = setupSuccessfulAppleAbortUploadResponse(Nock(fakeHost));
    });

    it("uploads ZIP with symbols", async () => {
      // Arrange
      const zipPath = await createZipWithFile();

      // Act
      const result = await executeUploadCommand(["-s", zipPath]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      const [url, uploadedZipPath] = AzureBlobUploadHelperMock.getUploadedArtifactUrlAndPath();
      expect(url).to.eql(fakeFullUploadUrl, `ZIP file should be uploaded to ${fakeFullUploadUrl}`);
      expect(uploadedZipPath).to.eql(zipPath, "Zip file should be passed as it is");
    });

    it("uploads dSYM folder", async () => {
      // Arrange
      const dsymFolder = createFolderWithSymbolsFile(tmpFolderPath, dSymFolder1Name, symbolsFile1Name, symbolsFileContent);

      // Act
      const result = await executeUploadCommand(["-s", dsymFolder]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      const [url, zipPath] = AzureBlobUploadHelperMock.getUploadedArtifactUrlAndPath();
      expect(url).to.eql(fakeFullUploadUrl, `ZIP file should be uploaded to ${fakeFullUploadUrl}`);

      const uploadedZipEntries = getEntitiesList(await getUploadedZip(zipPath));
      expect(uploadedZipEntries.length).to.eql(2, "Only two entries are expected to be in the ZIP");
      expect(uploadedZipEntries).to.contain(Path.join(dSymFolder1Name, symbolsFile1Name), "Test file should be inside the uploaded ZIP");
      expect(uploadedZipEntries).to.contain(dSymFolder1Name + Path.sep, ".dSYM folder should be inside the uploaded ZIP");
    });

    it("uploads dSYM parent folder", async () => {
      // Arrange
      const dsymParentFolder = createDsymParentFolder(tmpFolderPath, dSymParentFolderName);

      // Act
      const result = await executeUploadCommand(["-s", dsymParentFolder]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      const [url, zipPath] = AzureBlobUploadHelperMock.getUploadedArtifactUrlAndPath();
      expect(url).to.eql(fakeFullUploadUrl, `ZIP file should be uploaded to ${fakeFullUploadUrl}`);

      const uploadedZipEntries = getEntitiesList(await getUploadedZip(zipPath));
      expect(uploadedZipEntries.length).to.eql(4, "Only four entries are expected to be in the ZIP");
      expect(uploadedZipEntries).to.contain(dSymFolder1Name + Path.sep, "First .dSYM folder should be inside the uploaded ZIP");
      expect(uploadedZipEntries).to.contain(dSymFolder2Name + Path.sep, "Second .dSYM folder should be inside the uploaded ZIP");
      expect(uploadedZipEntries).to.contain(Path.join(dSymFolder1Name, symbolsFile1Name), "Symbols file 1 should be inside the first dsym folder of ZIP");
      expect(uploadedZipEntries).to.contain(Path.join(dSymFolder2Name, symbolsFile2Name), "Symbols file 2 should be inside the second dsym folder of ZIP");
    });

    it("uploads xcarchive folder", async () => {
      // Arrange
      const xcarchiveFolder = createXcArchiveFolder();

      // Act
      const result = await executeUploadCommand(["-x", xcarchiveFolder]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      const [url, zipPath] = AzureBlobUploadHelperMock.getUploadedArtifactUrlAndPath();
      expect(url).to.eql(fakeFullUploadUrl, `ZIP file should be uploaded to ${fakeFullUploadUrl}`);

      const uploadedZipEntries = getEntitiesList(await getUploadedZip(zipPath));
      expect(uploadedZipEntries.length).to.eql(4, "Only four entries are expected to be in the ZIP");
      expect(uploadedZipEntries).to.contain(dSymFolder1Name + Path.sep, "First .dSYM folder should be inside the uploaded ZIP");
      expect(uploadedZipEntries).to.contain(dSymFolder2Name + Path.sep, "Second .dSYM folder should be inside the uploaded ZIP");
      expect(uploadedZipEntries).to.contain(Path.join(dSymFolder1Name, symbolsFile1Name), "Symbols file 1 should be inside the first dsym folder of ZIP");
      expect(uploadedZipEntries).to.contain(Path.join(dSymFolder2Name, symbolsFile2Name), "Symbols file 2 should be inside the second dsym folder of ZIP");
    });

    it("uploads ZIP with added sourcemap file", async () => {
      // Arrange
      const zipPath = await createZipWithFile();
      const mappingsFilePath = createMappingsFile(mappingsFileContent);

      // Act
      const result = await executeUploadCommand(["-s", zipPath, "-m", mappingsFilePath]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      const [url, uploadedZipPath] = AzureBlobUploadHelperMock.getUploadedArtifactUrlAndPath();
      expect(url).to.eql(fakeFullUploadUrl, `ZIP file should be uploaded to ${fakeFullUploadUrl}`);
      expect(uploadedZipPath).not.to.eql(zipPath, "Uploaded ZIP path should be different from original ZIP path");

      const uploadedZipEntries = getEntitiesList(await getUploadedZip(uploadedZipPath));
      expect(uploadedZipEntries.length).to.eql(2, "Only two entries are expected to be in the ZIP");
      expect(uploadedZipEntries).to.contain(symbolsFile1Name, "Test file should be inside the uploaded ZIP");
      expect(uploadedZipEntries).to.contain(mappingsFileName, "Mappings file should be inside the uploaded ZIP");
    });

    it("uploads ZIP with updated sourcemap file", async () => {
      // Arrange
      const zipPath = await createZipWithFileAndMappings();
      const newMappingsFilePath = createMappingsFile(alternativeMappingsFileContent);

      // Act
      const result = await executeUploadCommand(["-s", zipPath, "-m", newMappingsFilePath]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      const [url, uploadedZipPath] = AzureBlobUploadHelperMock.getUploadedArtifactUrlAndPath();
      expect(url).to.eql(fakeFullUploadUrl, `ZIP file should be uploaded to ${fakeFullUploadUrl}`);
      expect(uploadedZipPath).not.to.eql(zipPath, "Uploaded ZIP path should be different from original ZIP path");

      const uploadedZip = await getUploadedZip(uploadedZipPath);
      const mappingsFileEntry = uploadedZip.file(mappingsFileName);
      expect(mappingsFileEntry).to.not.eql(null, "Mappings file should exist in the uploaded ZIP");
      const content = await mappingsFileEntry.async("text");
      expect(content).eql(alternativeMappingsFileContent, "Mappings should have updated content: " + alternativeMappingsFileContent);
    });
  });

  describe("when Apple upload fails", () => {
    before(() => {
      AzureBlobUploadHelperMock.throwOnUpload = true;
    });

    beforeEach(() => {
        expectedRequestsScope = _.flow(setupSuccessfulAppleAbortUploadResponse, setupSuccessfulApplePostUploadResponse)(Nock(fakeHost));
        skippedRequestsScope = setupSuccessfulApplePatchUploadResponse(Nock(fakeHost));
    });

    it("aborts the symbol uploading", async () => {
      // Arrange
      const zipPath = await createZipWithFile();

      // Act
      const result = await expect(executeUploadCommand(["-s", zipPath])).to.eventually.be.rejected;

      // Assert
      testUploadFailure(result, expectedRequestsScope, skippedRequestsScope);
    });

    after(() => {
      AzureBlobUploadHelperMock.throwOnUpload = false;
    });
  });

  describe("when Breakpad upload fails", () => {
    before(() => {
      AzureBlobUploadHelperMock.throwOnUpload = true;
    });

    beforeEach(() => {
        expectedRequestsScope = _.flow(setupSuccessfulBreakpadAbortUploadResponse, setupSuccessfulBreakpadPostUploadResponse)(Nock(fakeHost));
        skippedRequestsScope = setupSuccessfulBreakpadPatchUploadResponse(Nock(fakeHost));
    });

    it("aborts the symbol uploading", async () => {
      const zipPath = await createZipWithFile();

      const result = await expect(executeUploadCommand(["-b", zipPath])).to.eventually.be.rejected;

      testUploadFailure(result, expectedRequestsScope, skippedRequestsScope);
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
    const uploadSymbolsCommand = new UploadSymbolsCommand(getCommandArgs(args));
    return await uploadSymbolsCommand.execute();
  }

  function testCommandSuccess(result: CommandResult, executionScope: Nock.Scope, abortScope: Nock.Scope) {
      expect(result.succeeded).to.eql(true, "Command should be successfully completed");
      expect(abortScope.isDone()).to.eql(false, "Upload should not be aborted");
      executionScope.done(); // All normal API calls are executed
  }

  function testUploadFailure(result: CommandResult, executionScope: Nock.Scope, patchScope: Nock.Scope) {
      expect(result.succeeded).to.eql(false, "Command should fail");
      expect(patchScope.isDone()).to.eql(false, "Upload should not be completed");
      executionScope.done(); // All normal API calls are executed
  }

  async function createZipWithFile(): Promise<string> {
    // creating temp contents file for zip
    const symbolsFilePath = createSymbolsFileInsideFolder(tmpFolderPath, symbolsFile1Name, symbolsFileContent);

    // packing temp contents file to the zip
    const testZipFile = "testZip.zip";
    const testZipFilePath = Path.join(tmpFolderPath, testZipFile);
    const zip = new JsZip();
    const testFileContent = await Pfs.readFile(symbolsFilePath);
    zip.file(symbolsFile1Name, testFileContent);

    // writing zip file
    await Pfs.writeFile(testZipFilePath, await zip.generateAsync({
        type: "nodebuffer"
    }));

    return testZipFilePath;
  }

  async function createZipWithFileAndMappings(): Promise<string> {
    // creating usual zip file for uploading
    const zipFilePath = await createZipWithFile();

    // adding mappings file to the created zip and writing it back
    const zipContentBuffer = await Pfs.readFile(zipFilePath);
    const zip = await new JsZip().loadAsync(zipContentBuffer);
    zip.file(mappingsFileName, mappingsFileContent);
    const updatedZipContentBuffer = await zip.generateAsync({
      type: "nodebuffer"
    });
    await Pfs.writeFile(zipFilePath, updatedZipContentBuffer);

    return zipFilePath;
  }

  function createFolderWithSymbolsFile(path: string, folderName: string, fileName: string, fileContent: string): string {
    // creating folder
    const testFolderPath = Path.join(path, folderName);
    Fs.mkdirSync(testFolderPath);

    // creating symbols file inside folder
    createSymbolsFileInsideFolder(testFolderPath, fileName, fileContent);

    return testFolderPath;
  }

  function createDsymParentFolder(path: string, parentFolderName: string): string {
    // creating dsym parent folder
    const dsymParentFolderPath = Path.join(path, parentFolderName);
    Fs.mkdirSync(dsymParentFolderPath);

    // creating first dsymFolder with file
    createFolderWithSymbolsFile(dsymParentFolderPath, dSymFolder1Name, symbolsFile1Name, symbolsFileContent);

    // creating second dsymFolder with file
    createFolderWithSymbolsFile(dsymParentFolderPath, dSymFolder2Name, symbolsFile2Name, symbolsFileContent);

    // adding random file to the root which should not be added
    Fs.writeFileSync(Path.join(dsymParentFolderPath, randomFileName), randomFileContent);

    return dsymParentFolderPath;
  }

  function createXcArchiveFolder(): string {
    // creating .xcarchive folder
    const xcArchiveFolderPath = Path.join(tmpFolderPath, xcArchiveFolderName);
    Fs.mkdirSync(xcArchiveFolderPath);

    // creating dSyms folder inside with inner folders
    createDsymParentFolder(xcArchiveFolderPath, "dSYMs");

    return xcArchiveFolderPath;
  }

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["crashes", "upload-symbols"],
      commandPath: "FAKE"
    };
  }

  async function getUploadedZip(zip: string): Promise<JsZip> {
    const zipContent = await Pfs.readFile(zip);
    return await new JsZip().loadAsync(zipContent);
  }

  function getEntitiesList(zip: JsZip): string[] {
    return  Object.getOwnPropertyNames(zip.files).map((entity) => Path.normalize(entity));
  }

  function createSymbolsFileInsideFolder(folderPath: string, fileName: string, fileContent: string) {
    const symbolsFilePath = Path.join(folderPath, fileName);
    Fs.writeFileSync(symbolsFilePath, fileContent);
    return symbolsFilePath;
  }

  function createMappingsFile(content: string): string {
    // creating a test mappings file
    const mappingsFilePath = Path.join(tmpFolderPath, mappingsFileName);
    Fs.writeFileSync(mappingsFilePath, content);
    return mappingsFilePath;
  }

  function setupSuccessfulApplePostUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.post(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/symbol_uploads`, {
      symbol_type: "Apple"
    }).reply(200, ((uri: any, requestBody: any) => {
      postSymbolSpy(requestBody);
      return {
        expiration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        symbol_upload_id: fakeSymbolUploadingId,
        upload_url: fakeHost + fakeUploadUrl
      };
    }));
  }

  function setupSuccessfulBreakpadPostUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.post(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/symbol_uploads`, {
      symbol_type: "Breakpad"
    }).reply(200, ((uri: any, requestBody: any) => {
      postSymbolSpy(requestBody);
      return {
        expiration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        symbol_upload_id: fakeSymbolUploadingId,
        upload_url: fakeHost + fakeUploadUrl
      };
    }));
  }

  function setupSuccessfulApplePatchUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/symbol_uploads/${fakeSymbolUploadingId}`, {
      status: "committed"
    }).reply(200, ((uri: any, requestBody: any) => {
      patchSymbolSpy(requestBody);
      return {
        origin: "User",
        status: "committed",
        symbol_type: "Apple",
        symbol_upload_id: fakeSymbolUploadingId,
        symbols: new Array()
      };
    }));
  }

  function setupSuccessfulBreakpadPatchUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/symbol_uploads/${fakeSymbolUploadingId}`, {
      status: "committed"
    }).reply(200, ((uri: any, requestBody: any) => {
      patchSymbolSpy(requestBody);
      return {
        origin: "User",
        status: "committed",
        symbol_type: "Breakpad",
        symbol_upload_id: fakeSymbolUploadingId,
        symbols: new Array()
      };
    }));
  }

  function setupSuccessfulAppleAbortUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/symbol_uploads/${fakeSymbolUploadingId}`, {
      status: "aborted"
    }).reply(200, ((uri: any, requestBody: any) => {
      abortSymbolUploadSpy(requestBody);
      return {
        origin: "User",
        status: "aborted",
        symbol_type: "Apple",
        symbol_upload_id: fakeSymbolUploadingId,
        symbols: new Array()
      };
    }));
  }

  function setupSuccessfulBreakpadAbortUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/symbol_uploads/${fakeSymbolUploadingId}`, {
      status: "aborted"
    }).reply(200, ((uri: any, requestBody: any) => {
      abortSymbolUploadSpy(requestBody);
      return {
        origin: "User",
        status: "aborted",
        symbol_type: "Breakpad",
        symbol_upload_id: fakeSymbolUploadingId,
        symbols: new Array()
      };
    }));
  }
});
