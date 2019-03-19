import { expect, use } from "chai";
import * as Nock from "nock";
import * as ChaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";

use(ChaiAsPromised);

import ShowReleasesCommand from "../../../../src/commands/distribute/releases/show";
import { CommandArgs, CommandFailedResult, ErrorCodes } from "../../../../src/util/commandline";
import { out } from "../../../../src/util/interaction";
import { Destination, ReleaseDetailsResponse } from "../../../../src/util/apis/generated/models";

describe("releases show command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeReleaseId = 1;
  /* tslint:disable-next-line:no-http-string */
  const fakeHost = "http://localhost:1700";
  const releaseUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/releases/${fakeReleaseId}`;

  let sandbox: sinon.SinonSandbox;
  let reportStub: sinon.SinonStub;

  let nockScope: Nock.Scope;

  before(() => {
    sandbox = sinon.createSandbox();
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    reportStub = sandbox.stub(out, "report");
    nockScope = Nock(fakeHost);
  });

  afterEach(() => {
    sandbox.restore();
    Nock.cleanAll();
  });

  after(() => {
    Nock.enableNetConnect();
  });

  describe("when everything works as expected", () => {
    const destinations: Destination[] = [
      {
        name: "destination 1",
        id: "12345",
        destinationType: "group"
      },
      {
        name: "destination 2",
        id: "12345",
        destinationType: "tester"
      }
    ];
    // These models are here because the serialized property names are snake_case.
    const apiDestinations = [
      {
        name: "destination 1",
        id: "12345",
        destination_type: "group"
      },
      {
        name: "destination 2",
        id: "12345",
        destination_type: "tester"
      }
    ];

    const apiReleaseDetails = {
      id: fakeReleaseId,
      android_min_api_level: "5",
      app_name: fakeAppName,
      destinations: apiDestinations
    };

    const releaseDetails: ReleaseDetailsResponse = {
      id: apiReleaseDetails.id,
      androidMinApiLevel: apiReleaseDetails.android_min_api_level,
      appName: apiReleaseDetails.app_name,
      destinations: destinations
    };

    beforeEach(() => {
      nockScope.get(releaseUrl)
      .reply(200, apiReleaseDetails);
    });

    it("reports the command as succeeded", async () => {
      const command = new ShowReleasesCommand(getCommandArgs(["--release-id", fakeReleaseId.toString()]));
      const result = await command.execute();

      expect(result.succeeded).to.be.true;

      nockScope.done();
    });

    it("calls out.report with the correct parameters", async () => {
      const command = new ShowReleasesCommand(getCommandArgs(["--release-id", fakeReleaseId.toString()]));
      await command.execute();

      sinon.assert.calledWithExactly(reportStub, [
        ["ID", "id"],
        ["Status", "status"],
        ["Name", "appName"],
        ["Display Name", "appDisplayName"],
        ["Version", "version"],
        ["Short Version", "shortVersion"],
        ["Enabled", "enabled"],
        ["Release Notes", "releaseNotes"],
        ["Size", "size"],
        ["OS Required", "minOs"],
        ["Android API Required", "androidMinApiLevel"],
        ["Bundle Identifier", "bundleIdentifier"],
        ["Fingerprint", "fingerprint"],
        ["Uploaded At", "uploadedAt", out.report.asDate],
        ["Download URL", "downloadUrl"],
        ["Install URL", "installUrl"],
        ["Icon URL", "appIconUrl"],
        ["Destinations", "destinations", sinon.match.func]],
        releaseDetails
      );

      nockScope.done();
    });
  });

  describe("when the release does not exist", () => {
    beforeEach(() => {
      nockScope.get(releaseUrl)
      .reply(404, {
      });
    });

    it("reports the command as failed", async () => {
      const command = new ShowReleasesCommand(getCommandArgs(["--release-id", fakeReleaseId.toString()]));
      const result = await command.execute() as CommandFailedResult;

      expect(result.succeeded).to.be.false;
      expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
      expect(result.errorMessage).to.eql(`release ${fakeReleaseId} doesn't exist`);

      nockScope.done();
    });
  });

  describe("when the API returns an error", () => {
    beforeEach(() => {
      nockScope.get(releaseUrl)
      .reply(403, {
      });
    });

    it("reports the command as failed", async () => {
      const command = new ShowReleasesCommand(getCommandArgs(["--release-id", fakeReleaseId.toString()]));
      const result = await command.execute() as CommandFailedResult;

      expect(result.succeeded).to.be.false;
      expect(result.errorCode).to.eql(ErrorCodes.Exception);
      expect(result.errorMessage).to.eql("failed to load release details");

      nockScope.done();
    });
  });

  describe("when the release id is not a number", () => {
    it("reports the command as failed", async () => {
      const command = new ShowReleasesCommand(getCommandArgs(["--release-id", "lol"]));
      const result: CommandFailedResult = await command.execute() as CommandFailedResult;

      expect(result.succeeded).to.be.false;
      expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
      expect(result.errorMessage).to.eql("lol is not a valid release id");

      nockScope.done();
    });
  });

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "releases", "show"],
      commandPath: "FAKE"
    };
  }
});
