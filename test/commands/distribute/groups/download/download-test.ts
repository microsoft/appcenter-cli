import { expect } from "chai";
import * as Fs from "fs";
import * as Nock from "nock";
import * as Path from "path";
import * as Temp from "temp";
import * as _ from "lodash";
import * as Sinon from "sinon";

import DownloadBinaryFromDistributionGroupCommand from "../../../../../src/commands/distribute/groups/download";
import { CommandArgs, CommandResult } from "../../../../../src/util/commandline";
import { TokenValidator, tokenValidator } from "../../../../../src/commands/tokens/lib/token-helper";

Temp.track();

describe("distribute groups download command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeReleaseId = "1";
  const fakeDistributionGroupName = "fakeDistributionGroupName";
  const fakeHost = "http://localhost:1700";
  const fakeDownloadUrl = "/fake/download/url?format=apk";
  const fakeDownloadUrl2 = "/fake/download/url2?format=ipa";

  const releaseFileContent = "Hello World!";
  const releaseFileContent2 = "Hello again!";

  let tmpFolderPath: string;
  let validator: TokenValidator;

  before(() => {
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    tmpFolderPath = Temp.mkdirSync("groupsDownloadTest");

    validator = new tokenValidator();
    let stub = Sinon.stub(validator, "tokenIsValid").returns(Promise.resolve(true));
  });

  it("gets the latest release when no release is specified", async () => {
    // Arrange
    const releaseFilePath = Temp.path({prefix: "releaseFile", dir: tmpFolderPath});
    const executionScope = _.flow(setupGetLatestReleaseDetailsResponse, setupGetReleaseFileResponse)(Nock(fakeHost));
    const skippedScope = _.flow(setupGetReleasesForDistributionGroupResponse, setupGetReleaseDetailsResponse, setupGetReleaseFile2Response)(Nock(fakeHost));

    // Act 
    const command = new DownloadBinaryFromDistributionGroupCommand(
      getCommandArgs(["-g", fakeDistributionGroupName, "-f", Path.basename(releaseFilePath), "-d", Path.dirname(releaseFilePath)]));
    const result = await command.execute(validator);

    // Assert
    testCommandSuccess(result, executionScope, skippedScope);
    expect(Fs.existsSync(releaseFilePath)).to.eql(true, "Release file is expected to be created");
    expect(Fs.readFileSync(releaseFilePath, "utf8")).to.eql(releaseFileContent, "Release file content is invalid");
  });

  it("gets the specified release and checks that it was released to the distribution group", async () => {
    // Arrange
    const releaseFilePath = Temp.path({prefix: "releaseFile", dir: tmpFolderPath});
    const executionScope = _.flow(setupGetReleasesForDistributionGroupResponse, setupGetReleaseDetailsResponse, setupGetReleaseFile2Response)(Nock(fakeHost));
    const skippedScope = _.flow(setupGetLatestReleaseDetailsResponse, setupGetReleaseFileResponse)(Nock(fakeHost));

    // Act 
    const command = new DownloadBinaryFromDistributionGroupCommand(
      getCommandArgs(["-g", fakeDistributionGroupName, "-f", Path.basename(releaseFilePath), "-d", Path.dirname(releaseFilePath), "-i", fakeReleaseId]));
    const result = await command.execute(validator);

    // Assert
    testCommandSuccess(result, executionScope, skippedScope);
    expect(Fs.existsSync(releaseFilePath)).to.eql(true, "Release file is expected to be created");
    expect(Fs.readFileSync(releaseFilePath, "utf8")).to.eql(releaseFileContent2, "Release file content is invalid");
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  after(() => {
    Nock.enableNetConnect(); 
  });

  function testCommandSuccess(result: CommandResult, executionScope: Nock.Scope, abortScope?: Nock.Scope) {
    expect(result.succeeded).to.eql(true, "Command should be successfully completed");
    expect(abortScope.isDone()).to.eql(false, "Unexpected requests were made");
    executionScope.done(); // All normal API calls are executed
  }

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    let args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "testCloudLocalDev"].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "groups", "download"],
      commandPath: "FAKE_COMMAND_PATH"
    };
  }

  function setupGetLatestReleaseDetailsResponse(nockScope: Nock.Scope) {
    return nockScope.get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}/releases/latest`)
      .reply(200, {
        download_url: fakeHost + fakeDownloadUrl
      });
  }

  function setupGetReleaseFileResponse(nockScope: Nock.Scope) {
    return nockScope.get(fakeDownloadUrl)
      .reply(200, releaseFileContent);
  }

  function setupGetReleasesForDistributionGroupResponse(nockScope: Nock.Scope) {
    return nockScope.get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}/releases`)
      .reply(200, [{
        id: Number(fakeReleaseId)
      }]);
  }

  function setupGetReleaseDetailsResponse(nockScope: Nock.Scope) {
    return nockScope.get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`)
      .reply(200, {
        download_url: fakeHost + fakeDownloadUrl2
      });
  }

  function setupGetReleaseFile2Response(nockScope: Nock.Scope) {
    return nockScope.get(fakeDownloadUrl2)
      .reply(200, releaseFileContent2);
  }
});
