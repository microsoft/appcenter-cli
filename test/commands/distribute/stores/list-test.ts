import { expect, use } from "chai";
import * as Nock from "nock";
import * as ChaiAsPromised from "chai-as-promised";
import * as Sinon from "sinon";
import * as _ from "lodash";

use(ChaiAsPromised);

import ListStoresCommand from "../../../../src/commands/distribute/stores/list";
import { CommandArgs } from "../../../../src/util/commandline";
import { out } from "../../../../src/util/interaction";
import { ExternalStoreResponse } from "../../../../src/util/apis/generated/models";

describe("stores list command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  /* tslint:disable-next-line:no-http-string */
  const fakeHost = "http://localhost:1700";
  const storesListUrl = `/v0.1/apps/${fakeAppIdentifier}/distribution_stores`;

  const fakeStores: ExternalStoreResponse[] = [
    {
      id: "123456789",
      name: "fakeStore1",
      track: "alpha",
      type: "googleplay",
      serviceConnectionId: "123456789-123456789",
      createdBy: fakeAppOwner,
      intuneDetails: undefined,
    },
    {
      id: "345678765432",
      name: "fakeStore2",
      track: "production",
      type: "googleplay",
      serviceConnectionId: "123456789-987654321",
      createdBy: fakeAppOwner,
      intuneDetails: undefined,
    },
  ];

  let sandbox: Sinon.SinonSandbox;
  let reportStub: Sinon.SinonStub;

  let nockScope: Nock.Scope;

  before(() => {
    sandbox = Sinon.createSandbox();
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    reportStub = sandbox.stub(out, "table");
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
    beforeEach(() => {
      nockScope.get(storesListUrl).reply(200, fakeStores);
    });

    it("reports the command as succeeded", async () => {
      const command = new ListStoresCommand(getCommandArgs([]));
      const result = await command.execute();

      expect(result.succeeded).to.be.true;

      nockScope.done();
    });

    it("calls out.report with the correct parameters", async () => {
      const command = new ListStoresCommand(getCommandArgs([]));
      await command.execute();

      const storesReport = [
        Object.values(_.pick(fakeStores[0], ["name", "type", "track"])),
        Object.values(_.pick(fakeStores[1], ["name", "type", "track"])),
      ];

      Sinon.assert.calledWithMatch(reportStub, { head: ["Store", "Type", "Track"] }, storesReport);

      nockScope.done();
    });
  });

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "stores", "list"],
      commandPath: "FAKE",
    };
  }
});
