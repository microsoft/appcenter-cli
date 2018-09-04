import * as Nock from "nock";
import * as Temp from "temp";
import * as Sinon from "sinon";
import { expect } from "chai";
import release from "../../../src/commands/codepush/release";
import * as updateContentsTasks from "../../../src/commands/codepush/lib/update-contents-tasks";
import { getFakeParamsForRequest, createFile, getCommandArgsForReleaseCommand, FakeParamsForRequests, nockPlatformRequest, getLastFolderForSignPath, nockRequestForValidation } from "./utils";
import { CommandArgs } from "../../../src/util/commandline";

describe("CodePush release tests", () => {
  const tmpFolderPath = Temp.mkdirSync("releaseTest");
  const releaseFileName = "releaseBinaryFile";
  const releaseFileContent = "Hello World!";

  const fakeParamsForRequests: FakeParamsForRequests = getFakeParamsForRequest();

  let nockedRequests: Nock.Scope;
  let stubbedSign: Sinon.SinonStub;

  beforeEach(() => {
    nockedRequests = nockRequestForValidation(fakeParamsForRequests);
    stubbedSign = Sinon.stub(updateContentsTasks, "sign");
  });

  afterEach(() => {
    Nock.cleanAll();
    stubbedSign.restore();
  });

  describe("CodePush signed release", () => {
    describe("CodePush path generation", () => {
      it("CodePush path generation for React-Native with private key", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
        nockPlatformRequest("React-Native", fakeParamsForRequests, nockedRequests);
        const args: CommandArgs = getCommandArgsForReleaseCommand(["-c", releaseFilePath, "-k", "fakePrivateKey.pem"], fakeParamsForRequests);

        // Act
        const testRelaseSkeleton = new release(args);
        await testRelaseSkeleton.execute();

        // Assert
        const lastFolderForSignPath = getLastFolderForSignPath(stubbedSign);
        expect(lastFolderForSignPath).to.eql("CodePush", "Last folder in path should be 'CodePush'");
        nockedRequests.done();
      });

      it("CodePush path generation for Cordova with private key", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
        nockPlatformRequest("Cordova", fakeParamsForRequests, nockedRequests);
        const args: CommandArgs = getCommandArgsForReleaseCommand(["-c", releaseFilePath, "-k", "fakePrivateKey.pem"], fakeParamsForRequests);

        // Act
        const testRelaseSkeleton = new release(args);
        await testRelaseSkeleton.execute();

        // Assert
        const lastFolderForSignPath = getLastFolderForSignPath(stubbedSign);
        expect(lastFolderForSignPath).to.not.eql("CodePush", "Last folder in path shouldn't be 'CodePush'");
        nockedRequests.done();
      });
    });
  });
});
