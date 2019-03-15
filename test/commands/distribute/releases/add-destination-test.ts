import { expect, use } from "chai";
import * as Nock from "nock";
import * as ChaiAsPromised from "chai-as-promised";

use(ChaiAsPromised);

import AddDestinationCommand from "../../../../src/commands/distribute/releases/add-destination";
import { CommandArgs, CommandFailedResult, ErrorCodes } from "../../../../src/util/commandline";

describe("releases add-destination command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeReleaseId = "1";
  const fakeDistributionGroupName = "fakeDistributionGroupName";
  /* tslint:disable-next-line:no-http-string */
  const fakeHost = "http://localhost:1700";
  const getDistributionGroupUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}`;
  const postAddReleaseGroupDestinationUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}/groups`;

  let nockScope: Nock.Scope;

  before(() => {
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    nockScope = Nock(fakeHost);
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  after(() => {
    Nock.enableNetConnect();
  });

  describe("when everything works as expected", function () {
    beforeEach(() => {
      nockScope.get(getDistributionGroupUrl)
        .reply(200, {
          id: "00000000-0000-0000-0000-000000000000",
          name: fakeDistributionGroupName,
          dismay_name: "my group",
          origin: "appcenter",
          is_public: false
        });

        nockScope.post(postAddReleaseGroupDestinationUrl)
        .reply(201, {
        });
    });

    it("reports the command as succeeded", async () => {
      const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "group", "--destination", fakeDistributionGroupName]));
      const result = await command.execute();

      expect(result.succeeded).to.be.true;

      nockScope.done();
    });
  });

  describe("when the distribution group does not exist", () => {
    beforeEach(() => {
      nockScope.get(getDistributionGroupUrl)
        .reply(404, {});
    });

    it("reports the command as failed", async () => {
      const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "group", "--destination", fakeDistributionGroupName]));
      const result: CommandFailedResult = await command.execute() as CommandFailedResult;

      expect(result.succeeded).to.be.false;
      expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
      expect(result.errorMessage).to.eql(`Could not find group ${fakeDistributionGroupName}`);
    });
  });

  describe("when the release id is not a number", () => {
    it("reports the command as failed", async () => {
      const command = new AddDestinationCommand(getCommandArgs(["--release-id", "lol", "--type", "group", "--destination", fakeDistributionGroupName]));
      const result: CommandFailedResult = await command.execute() as CommandFailedResult;

      expect(result.succeeded).to.be.false;
      expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
      expect(result.errorMessage).to.eql("lol is not a valid release id");
    });
  });

  describe("when an invalid destination type is provided", () => {
    it("reports the command as failed", async () => {
      const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "not-a-type", "--destination", fakeDistributionGroupName]));
      const result: CommandFailedResult = await command.execute() as CommandFailedResult;

      expect(result.succeeded).to.be.false;
      expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
      expect(result.errorMessage).to.eql("not-a-type is not a valid destination type. Available types are: group, tester");
    });
  });

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "releases", "add-destination"],
      commandPath: "FAKE"
    };
  }
});
