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
import FileUploadClient from "appcenter-file-upload-client";

Temp.track();

describe("release command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeReleaseUploadingId = "fakeReleaseUploadingId";
  const fakeUploadUrl = "/upload/here";
  const fakeReleaseAssetId = "fakeReleaseAssetId";
  const fakeReleaseAssetDomain = "www.sss.com:8909/ttt";
  const fakeReleaseAssetToken = "fakeAssetToken";
  const fakeReleaseId = "1";
  const fakeReleaseUrl = "/fake/release/url/" + fakeReleaseId;
  const fakeDistributionGroupName = "fakeDistributionGroupName";
  const fakeHost = "http://localhost:1700";
  const version = "1.0";
  const shortVersion = "1";

  const releaseFileName = "releaseBinaryFile";
  const releaseNotesFileName = "releaseNotesFile";

  const releaseFileContent = "Hello World!";
  const releaseNotes = "Release Notes for v1";

  let tmpFolderPath: string;
  let releaseFilePath : string;
  let releaseNotesFilePath: string;

  let releaseNoteStub: Sinon.SinonStub;
  let fileUploadStub: Sinon.SinonStub;


  let expectedRequestsScope: Nock.Scope;
  let skippedRequestsScope: Nock.Scope;

  before(() => {
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    tmpFolderPath = Temp.mkdirSync("releaseTest");
    releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
    releaseNotesFilePath = createFile(tmpFolderPath, releaseNotesFileName, releaseNotes);
  });

  describe("when distribution group was not found", () => {
    before(() => {
      return Nock(fakeHost).get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}/members`)
      .replyWithError('something awful happened');
    });

    it('should throw distribution group not found error', async () => {
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName]));
      const result = await expect(command.execute()).to.eventually.be.rejected;
      expect(result.succeeded).false;
    });
  });

  describe("when both --release-notes-file and --release-notes were set", () => {
    it('should throw mutually exclusive error', async () => {
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName, "-r", releaseNotes, "-R", releaseNotesFilePath]));
      const result = await expect(command.execute()).to.eventually.be.rejected;
      expect(result.succeeded).false;
      expect(result.errorMessage).equal("'--release-notes' and '--release-notes-file' switches are mutually exclusive");
    });
  });

  describe("when initiating the file upload failed", () => {
    before(() => {
      Nock(fakeHost).get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads`)
      .replyWithError('something awful happened');
    });

    it('should throw exception', async () => {
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName]));
      const result = await expect(command.execute()).to.eventually.be.rejected;
      expect(result.succeeded).false;
    });
  });

  describe("when uploading process failed", () => {
    before(() => {
      Nock(fakeHost).get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}/members`)
      .reply(200, ((uri: any, requestBody: any) => {
        return [{ /* Single user, fields are not used */}];
      }));

      Nock(fakeHost).post(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads`)
      .reply(201, ((uri: any, requestBody: any) => {
        return {
          upload_id: fakeReleaseUploadingId,
          upload_url: fakeHost + fakeUploadUrl,
          asset_id: fakeReleaseAssetId,
          asset_domain: fakeReleaseAssetDomain,  
          asset_token: fakeReleaseAssetToken
        };
      }));

      fileUploadStub = Sinon.stub(FileUploadClient.prototype, 'upload');
      fileUploadStub.returns(Promise.reject({error:"failed to upload the file."}));
    });

    after(() => {
      fileUploadStub.restore();
    });

    it('should throw exception', async () => {
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName]));
      const result = await expect(command.execute()).to.eventually.be.rejected;
      Sinon.assert.calledOnce(fileUploadStub);
    });
  });

  describe("when processing the file after upload failed", () => {
    before(() => {
      Nock(fakeHost).get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}/members`)
      .reply(200, ((uri: any, requestBody: any) => {
        return [{ /* Single user, fields are not used */}];
      }));

      Nock(fakeHost).post(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads`)
      .reply(201, ((uri: any, requestBody: any) => {
        return {
          upload_id: fakeReleaseUploadingId,
          upload_url: fakeHost + fakeUploadUrl,
          asset_id: fakeReleaseAssetId,
          asset_domain: fakeReleaseAssetDomain,  
          asset_token: fakeReleaseAssetToken
        };
      }));

      fileUploadStub = Sinon.stub(FileUploadClient.prototype, 'upload');
      fileUploadStub.returns(Promise.resolve({assetId: fakeReleaseAssetId}));

      Nock(fakeHost).post(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads/${fakeReleaseAssetId}/status`)
      .replyWithError('something awful happened');
    });

    after(() => {
      fileUploadStub.restore();
    });

    it('should throw exception', async () => {
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName]));
      const result = await expect(command.execute()).to.eventually.be.rejected;
    });

  });

  describe("when distribute a release failed after processing file successfully", () => {
    before(() => {
      Nock(fakeHost).get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}/members`)
      .reply(200, ((uri: any, requestBody: any) => {
        return [{ /* Single user, fields are not used */}];
      }));

      Nock(fakeHost).post(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads`)
      .reply(201, ((uri: any, requestBody: any) => {
        return {
          upload_id: fakeReleaseUploadingId,
          upload_url: fakeHost + fakeUploadUrl,
          asset_id: fakeReleaseAssetId,
          asset_domain: fakeReleaseAssetDomain,  
          asset_token: fakeReleaseAssetToken
        };
      }));

      fileUploadStub = Sinon.stub(FileUploadClient.prototype, 'upload');
      fileUploadStub.returns(Promise.resolve({assetId: fakeReleaseAssetId}));

      Nock(fakeHost).get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads/${fakeReleaseAssetId}/status`)
      .reply(200, ((uri: any, requestBody: any) => {
        return {
          progress: 100,
          releaseId: parseInt(fakeReleaseId)
        };
      }));

      Nock(fakeHost).patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`, {
        distribution_group_name: fakeDistributionGroupName,
        release_notes: releaseNotes
      }).replyWithError('something awful happened');
    });

    after(() => {
      fileUploadStub.restore();
    });

    it('should throw exception', async () => {
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName]));
      const result = await expect(command.execute()).to.eventually.be.rejected;
    });

  });

  describe("when the release was created successfully", () => {
    before(() => {
      Nock(fakeHost).get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}/members`)
      .reply(200, ((uri: any, requestBody: any) => {
        return [{ /* Single user, fields are not used */}];
      }));

      Nock(fakeHost).post(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads`)
      .reply(201, ((uri: any, requestBody: any) => {
        return {
          upload_id: fakeReleaseUploadingId,
          upload_url: fakeHost + fakeUploadUrl,
          asset_id: fakeReleaseAssetId,
          asset_domain: fakeReleaseAssetDomain,  
          asset_token: fakeReleaseAssetToken
        };
      }));

      fileUploadStub = Sinon.stub(FileUploadClient.prototype, 'upload');
      fileUploadStub.returns(Promise.resolve({assetId: fakeReleaseAssetId}));

      Nock(fakeHost).get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/release_uploads/${fakeReleaseAssetId}/status`)
      .reply(200, ((uri: any, requestBody: any) => {
        return {
          progress: 100,
          releaseId: parseInt(fakeReleaseId)
        };
      }));

      Nock(fakeHost).patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`, {
        distribution_group_name: fakeDistributionGroupName
      }).reply(200, ((uri: any, requestBody: any) => {
        return {
        };
      }));
    });

    after(() => {
      fileUploadStub.restore();
    });

    it('should be success finish the whole process', async () => {
      const command = new ReleaseBinaryCommand(getCommandArgs(["-f", releaseFilePath, "-g", fakeDistributionGroupName]));
      const result = await command.execute();
      expect(result.succeeded).true;
    });
  })

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

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    let args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "release"],
      commandPath: "FAKE"
    };
  }
});
