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

  describe("validate input parameters", () => {
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
        expect(result.errorMessage).to.contain("not-a-type is not a valid destination type.");
      });
    });
  });

  describe("when distributing a group", () => {
    const fakeGroupId = "00000000-0000-0000-0000-000000000000";
    const getDistributionGroupUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}`;
    const postAddReleaseGroupDestinationUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}/groups`;

    describe("when the distribution is successful", function () {
      beforeEach(() => {
        nockScope.get(getDistributionGroupUrl)
        .reply(200, {
          id: fakeGroupId,
          name: fakeDistributionGroupName,
          dismay_name: "my group",
          origin: "appcenter",
          is_public: false
        });
      });

      function successfulGroupMock(options: { mandatory: boolean, silent: boolean}) {
        const expectedBody = {
          id: fakeGroupId,
          mandatory_update: options.mandatory,
          notify_testers: !options.silent
        };

        nockScope.post(postAddReleaseGroupDestinationUrl, expectedBody)
        .reply(201, {
          id: fakeGroupId,
          mandatory_update: options.mandatory,
          notify_testers: !options.silent
        });
      }

      it("reports the command as succeeded", async () => {
        successfulGroupMock({ mandatory: false, silent: false });

        const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "group", "--destination", fakeDistributionGroupName]));
        const result = await command.execute();

        expect(result.succeeded).to.be.true;

        nockScope.done();
      });

      it("reports the command as succeeded with --mandatory", async () => {
        successfulGroupMock({ mandatory: true, silent: false });

        const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "group", "--destination", fakeDistributionGroupName, "--mandatory"]));
        const result = await command.execute();

        expect(result.succeeded).to.be.true;
      });

      it("reports the command as succeeded with --silent", async () => {
        successfulGroupMock({ mandatory: false, silent: true });

        const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "group", "--destination", fakeDistributionGroupName, "--silent"]));
        const result = await command.execute();

        expect(result.succeeded).to.be.true;
      });

      it("reports the command as succeeded with --silent and --mandatory", async () => {
        successfulGroupMock({ mandatory: true, silent: true });
        const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "group", "--destination", fakeDistributionGroupName, "--mandatory", "--silent"]));
        const result = await command.execute();

        expect(result.succeeded).to.be.true;
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

    describe("when the release does not exist", function () {
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
          .reply(404, {
          });
      });

      it("reports the command as failed", async () => {
        const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "group", "--destination", fakeDistributionGroupName]));
        const result: CommandFailedResult = await command.execute() as CommandFailedResult;

        expect(result.succeeded).to.be.false;
        expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
        expect(result.errorMessage).to.eql(`Could not find release ${fakeReleaseId}`);
      });
    });

  });

  describe("when distributing a tester", () => {
    const fakeTesterEmail = "fake@gmail.com";
    const addReleaseTesterDestinationUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}/testers`;

    describe("when the release doesn't exist", () => {
      it("reports the command as failed", async () => {
        nockScope
          .post(addReleaseTesterDestinationUrl)
          .reply(404);

          const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "tester", "--destination", fakeTesterEmail]));
          const result: CommandFailedResult = await command.execute() as CommandFailedResult;

          expect(result.succeeded).to.be.false;
          expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
          expect(result.errorMessage).to.eql(`Could not find release ${fakeReleaseId}`);
      });
    });
    describe("when the distribution failed", () => {
      it("reports the command as failed", async () => {
        nockScope
          .post(addReleaseTesterDestinationUrl)
          .reply(400);

        const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "tester", "--destination", fakeTesterEmail]));
        const result: CommandFailedResult = await command.execute() as CommandFailedResult;

        expect(result.succeeded).to.be.false;
        expect(result.errorCode).to.eql(ErrorCodes.Exception);

        expect(result.errorMessage).to.eql(`Could not add tester ${fakeTesterEmail} to release ${fakeReleaseId}`);
      });
    });

    describe("when the distribution is successful", () => {
      it("reports the command as succeeded", async () => {
        successfulTesterMock({ mandatory: false, silent: false });

        const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "tester", "--destination", fakeTesterEmail]));
        const result = await command.execute();

        expect(result.succeeded).to.be.true;
      });

       it("reports the command as succeeded with --mandatory", async () => {
        successfulTesterMock({ mandatory: true, silent: false });

        const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "tester", "--destination", fakeTesterEmail, "--mandatory"]));
        const result = await command.execute();

        expect(result.succeeded).to.be.true;
      });

      it("reports the command as succeeded with --silent", async () => {
        successfulTesterMock({ mandatory: false, silent: true });

        const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "tester", "--destination", fakeTesterEmail, "--silent"]));
        const result = await command.execute();

        expect(result.succeeded).to.be.true;
      });

      it("reports the command as succeeded with --silent and --mandatory", async () => {
        successfulTesterMock({ mandatory: true, silent: true });
        const command = new AddDestinationCommand(getCommandArgs(["--release-id", fakeReleaseId, "--type", "tester", "--destination", fakeTesterEmail, "--mandatory", "--silent"]));
        const result = await command.execute();

        expect(result.succeeded).to.be.true;
      });
    });
    function successfulTesterMock(options: { mandatory: boolean, silent: boolean }) {
      const expectedBody = {
        email: fakeTesterEmail,
        mandatory_update: options.mandatory,
        notify_testers: !options.silent
      };
      nockScope
        .post(addReleaseTesterDestinationUrl, expectedBody)
        .reply(201, {
          email: fakeTesterEmail,
          mandatory_update: options.mandatory,
          notify_testers: !options.silent
        });
    }
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
