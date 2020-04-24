import { expect, use } from "chai";
import * as Nock from "nock";
import * as ChaiAsPromised from "chai-as-promised";

use(ChaiAsPromised);

import CreateTokenCommand from "../../../src/commands/tokens/create";
import { CommandArgs, CommandFailedResult, ErrorCodes } from "../../../src/util/commandline";

describe("Tokens Create", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeReleaseId = "1";
  const fakeDescription = "fakeDescription";
  const fakeStoreName = "fakeStore";
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

  it("#create providing 'user' as type calls the user API", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const createUserTokenUrl = `/v0.1/api_tokens`;

    const expectedBody = {
      description: "description",
    };

    nockScope.post(createUserTokenUrl, expectedBody).reply(201, {
      id: fakeId,
      description: fakeDescription,
      api_token: "token",
      scope: "all"
    });

    const command = new CreateTokenCommand(
      getCommandArgs(["--type", "user", "--description", fakeDescription])
    );
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("#create user type calls correctly when description provided", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const createUserTokenUrl = `/v0.1/api_tokens`;

    const expectedBody = {
      description: "description",
    };

    nockScope.post(createUserTokenUrl, expectedBody).reply(201, {
      id: fakeId,
      description: fakeDescription,
      api_token: "token",
      scope: "all"
    });

    const command = new CreateTokenCommand(
      getCommandArgs(["--type", "user", "--description", fakeDescription])
    );
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("#create providing no args succeeds in calling the default user API", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const createUserTokenUrl = `/v0.1/api_tokens`;

    const expectedBody = {
      description: "description",
    };

    nockScope.post(createUserTokenUrl, expectedBody).reply(201, {
      id: fakeId,
      description: fakeDescription,
      api_token: "token",
      scope: "all"
    });

    const command = new CreateTokenCommand(getCommandArgs(["--type", "user", "--description", fakeDescription]));
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("#create providing app type calls the correct app create API when current-app is set", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const createUserTokenUrl = `/v0.1/api_tokens`;

    const expectedBody = {
      description: "description",
    };

    nockScope.post(createUserTokenUrl, expectedBody).reply(201, {
      id: fakeId,
      description: fakeDescription,
      api_token: "token",
      scope: "all"
    });

    const command = new CreateTokenCommand();
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("#create providing app type calls the correct app create API when MOBILE_CENTER_CURRENT_APP is set", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const createUserTokenUrl = `/v0.1/api_tokens`;

    const expectedBody = {
      description: "description",
    };

    nockScope.post(createUserTokenUrl, expectedBody).reply(201, {
      id: fakeId,
      description: fakeDescription,
      api_token: "token",
      scope: "all"
    });

    const command = new CreateTokenCommand();
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

    it("#create providing app type calls fails if the app info isn't set", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const createUserTokenUrl = `/v0.1/api_tokens`;

    const expectedBody = {
      description: "description",
    };

    nockScope.post(createUserTokenUrl, expectedBody).reply(201, {
      id: fakeId,
      description: fakeDescription,
      api_token: "token",
      scope: "all"
    });

    const command = new CreateTokenCommand();
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  describe("when distributing a store", () => {
    const getStoreUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_stores/${fakeStoreName}`;

    describe("when the store does not exist", () => {
      beforeEach(() => {
        nockScope.get(getStoreUrl).reply(404, {});
      });

      it("reports the command as failed", async () => {
        const command = new CreateTokenCommand(
          getCommandArgs(["--release-id", fakeReleaseId, "--type", "store", "--destination", fakeStoreName])
        );
        const result: CommandFailedResult = (await command.execute()) as CommandFailedResult;

        expect(result.succeeded).to.be.false;
        expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
        expect(result.errorMessage).to.eql(`Could not find store ${fakeStoreName}`);
      });
    });
    it("reports the command as failed", async () => {
      const command = new CreateTokenCommand(
        getCommandArgs(["--release-id", fakeReleaseId, "--type", "store", "--destination", fakeStoreName])
      );
      const result: CommandFailedResult = (await command.execute()) as CommandFailedResult;

      expect(result.succeeded).to.be.false;
      expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
      expect(result.errorMessage).to.eql(`Could not find release ${fakeReleaseId}`);
    });
  });
  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "releases", "add-destination"],
      commandPath: "FAKE",
    };
  }
});
