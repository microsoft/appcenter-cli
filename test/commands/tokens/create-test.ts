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
  const fakeDescription = "fakeDescription";
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

    nockScope.post(createUserTokenUrl).reply(201, {
      id: fakeId,
      api_token: "token",
      scope: "all",
    });

    const command = new CreateTokenCommand(getCommandArgs(["--type", "user"]));
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("#create user type calls user API with description when description provided", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const createUserTokenUrl = `/v0.1/api_tokens`;

    nockScope.post(createUserTokenUrl, { description: fakeDescription }).reply(201, {
      id: fakeId,
      description: fakeDescription,
      api_token: "token",
      scope: "all",
    });

    const command = new CreateTokenCommand(getCommandArgs(["--type", "user", "--description", fakeDescription]));
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("#create providing no args succeeds in calling the default user API", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const createUserTokenUrl = `/v0.1/api_tokens`;

    nockScope.post(createUserTokenUrl, {}).reply(201, {
      id: fakeId,
      description: fakeDescription,
      api_token: "token",
      scope: "all",
    });

    const command = new CreateTokenCommand(getCommandArgs([]));
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("#create providing app type calls the app create API", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const createAppTokenUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/api_tokens`;

    nockScope.post(createAppTokenUrl, { description: fakeDescription }).reply(201, {
      id: fakeId,
      description: fakeDescription,
      api_token: "token",
      scope: "all",
    });

    const command = new CreateTokenCommand(getCommandArgsWithApp(["--type", "app", "--description", fakeDescription]));
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("#create providing invalid type calls fails", async () => {
    const command = new CreateTokenCommand(getCommandArgsWithApp(["--type", "fake", "--description", fakeDescription]));
    const result: CommandFailedResult = (await command.execute()) as CommandFailedResult;

    expect(result.succeeded).to.be.false;
    expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
    expect(result.errorMessage).to.eql(`Provided token type is invalid. Should be: [user, app]`);

    nockScope.done();
  });

  it("#create providing app type calls fails with 400 response", async () => {
    const createAppTokenUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/api_tokens`;

    nockScope.post(createAppTokenUrl, { description: fakeDescription }).reply(400, {});

    const command = new CreateTokenCommand(getCommandArgsWithApp(["--type", "app", "--description", fakeDescription]));
    const result: CommandFailedResult = (await command.execute()) as CommandFailedResult;

    expect(result.succeeded).to.be.false;
    expect(result.errorCode).to.eql(ErrorCodes.Exception);
    expect(result.errorMessage).to.eql(`invalid request`);

    nockScope.done();
  });

  function getCommandArgsWithApp(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["tokens", "create"],
      commandPath: "FAKE",
    };
  }

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["tokens", "create"],
      commandPath: "FAKE",
    };
  }
});
