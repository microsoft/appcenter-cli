import * as JsZip from "jszip";
import { expect } from "chai";
import * as Fs from "fs";
import * as Pfs from "../../../../src/util/misc/promisfied-fs";
import { IncomingMessage } from "http";
import * as _ from "lodash";
import * as Nock from "nock";
import * as Path from "path";
import * as Sinon from "sinon";
import * as Temp from "temp";

import UploadSymbolsCommand from "../../../../src/commands/crashes/upload-symbols";
import { MobileCenterClient } from "../../../../src/util/apis";
import { CommandArgs, CommandResult } from "../../../../src/util/commandline";

Temp.track();

describe("upload-symbols command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeSymbolUploadingId = "fakeSymbolUploadingId";
  const fakeUploadUrl = "/upload/here";
  const fakeHost = "http://localhost:1700";

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
  
  let uploaderSpy: Sinon.SinonSpy;
  let postSymbolSpy: Sinon.SinonSpy;
  let patchSymbolSpy: Sinon.SinonSpy;
  let abortSymbolUploadSpy: Sinon.SinonSpy;

  let expectedRequestsScope: Nock.Scope;
  let skippedRequestsScope: Nock.Scope;

  beforeEach(() => {
    tmpFolderPath = Temp.mkdirSync("uploadSymbolsTest");
    uploaderSpy = Sinon.spy();
    postSymbolSpy = Sinon.spy();
    patchSymbolSpy = Sinon.spy();
    abortSymbolUploadSpy = Sinon.spy();
  });

  describe("when network requests are successful", () => {
    beforeEach(() => {
        expectedRequestsScope = setupSuccessfulPostUploadResponse(setupSuccessfulPutUploadResponse(setupSuccessfulPatchUploadResponse(Nock(fakeHost))));
        skippedRequestsScope = setupSuccessfulAbortUploadResponse(Nock(fakeHost));
    });

    it("uploads ZIP with symbols", async () => {
      // Arrange
      const zipPath = await createZipWithFile();

      // Act
      let result = await executeUploadCommand(["-s", zipPath]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      let uploadedZipEntries = getEntitiesList(await getUploadedZip());
      expect(uploadedZipEntries.length).to.eql(1, "Only one entry is expected to be in the ZIP");
      expect(uploadedZipEntries).to.contain(symbolsFile1Name, "Test file should be inside the uploaded ZIP");
    });

    it("uploads dSym folder", async () => {
      // Arrange
      const dsymFolder = createFolderWithSymbolsFile(tmpFolderPath, dSymFolder1Name, symbolsFile1Name, symbolsFileContent);

      // Act
      let result = await executeUploadCommand(["-s", dsymFolder]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      let uploadedZipEntries = getEntitiesList(await getUploadedZip());
      expect(uploadedZipEntries.length).to.eql(2, "Only two entries are expected to be in the ZIP");
      expect(uploadedZipEntries).to.contain(Path.join(dSymFolder1Name, symbolsFile1Name), "Test file should be inside the uploaded ZIP");
      expect(uploadedZipEntries).to.contain(dSymFolder1Name + Path.sep, ".dSYM folder should be inside the uploaded ZIP");
    });

    it("uploads dSYM parent folder", async () => {
      // Arrange
      const dsymParentFolder = createDsymParentFolder(tmpFolderPath, dSymParentFolderName);

      // Act
      let result = await executeUploadCommand(["-s", dsymParentFolder]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      let uploadedZipEntries = getEntitiesList(await getUploadedZip());
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
      let result = await executeUploadCommand(["-x", xcarchiveFolder]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      let uploadedZipEntries = getEntitiesList(await getUploadedZip());
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
      let result = await executeUploadCommand(["-s", zipPath, "-m", mappingsFilePath]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      let uploadedZipEntries = getEntitiesList(await getUploadedZip());
      expect(uploadedZipEntries.length).to.eql(2, "Only two entries are expected to be in the ZIP");
      expect(uploadedZipEntries).to.contain(symbolsFile1Name, "Test file should be inside the uploaded ZIP");
      expect(uploadedZipEntries).to.contain(mappingsFileName, "Mappings file should be inside the uploaded ZIP");
    });

    it("uploads ZIP with updated sourcemap file", async() => {
      // Arrange
      const zipFilePath = await createZipWithFileAndMappings();
      const newMappingsFilePath = createMappingsFile(alternativeMappingsFileContent);

      // Act
      let result = await executeUploadCommand(["-s", zipFilePath, "-m", newMappingsFilePath]);

      // Assert
      testCommandSuccess(result, expectedRequestsScope, skippedRequestsScope);
      let uploadedZip = await getUploadedZip();
      let mappingsFileEntry = uploadedZip.file(mappingsFileName);
      expect(mappingsFileEntry).to.not.eql(null, "Mappings file should exist in the uploaded ZIP");
      let content = await mappingsFileEntry.async("string");
      expect(content).eql(alternativeMappingsFileContent, "Mappings should have updated content: " + alternativeMappingsFileContent);
    });
  });

  describe("when upload fails", () => {
    beforeEach(() => {
        expectedRequestsScope = setupSuccessfulPostUploadResponse(setupFailedPutUploadResponse(setupSuccessfulAbortUploadResponse(Nock(fakeHost))));
        skippedRequestsScope = setupSuccessfulPatchUploadResponse(Nock(fakeHost));
    });

    it("aborts the symbol uploading", async () => {
      // Arrange
      const zipPath = await createZipWithFile();

      // Act
      let result = await executeUploadCommand(["-s", zipPath]);
      
      // Assert
      testUploadFailure(result, expectedRequestsScope, skippedRequestsScope);
    });
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  after(() => {
    Nock.restore();    
  });

  async function executeUploadCommand(args: string[]): Promise<CommandResult> {
    let uploadSymbolsCommand = new UploadSymbolsCommand(getCommandArgs(args));
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
    let zip = new JsZip();
    let testFileContent = await Pfs.readFile(symbolsFilePath);
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
    let zipContentBuffer = await Pfs.readFile(zipFilePath);
    let zip = await new JsZip().loadAsync(zipContentBuffer);
    zip.file(mappingsFileName, mappingsFileContent);
    let updatedZipContentBuffer = await zip.generateAsync({
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
    const filePath = createSymbolsFileInsideFolder(testFolderPath, fileName, fileContent);

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
    Fs.writeFile(Path.join(dsymParentFolderPath, randomFileName), randomFileContent);

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
    let args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "testCloudLocalDev"].concat(additionalArgs);
    return {
      args,
      command: ["crashes", "upload-symbols"],
      commandPath: "FAKE"
    };
  }

  async function getUploadedZip(): Promise<JsZip> {
    return await new JsZip().loadAsync(new Buffer(uploaderSpy.lastCall.args[0], "hex"));
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

  function setupSuccessfulPostUploadResponse(nockScope: Nock.Scope): Nock.Scope {
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

  function setupSuccessfulPutUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.put(fakeUploadUrl).reply(200, (uri: any, requestBody: any) => {
      uploaderSpy(requestBody);
    });
  }

  function setupFailedPutUploadResponse(nockScope: Nock.Scope): Nock.Scope {
    return nockScope.put(fakeUploadUrl).reply(500, (uri: any, requestBody: any) => {
      uploaderSpy(requestBody);
    });
  }

  function setupSuccessfulPatchUploadResponse(nockScope: Nock.Scope): Nock.Scope {
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

  function setupSuccessfulAbortUploadResponse(nockScope: Nock.Scope): Nock.Scope {
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
});
