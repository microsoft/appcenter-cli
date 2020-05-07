import { expect } from "chai";
import * as Nock from "nock";
import * as Sinon from "sinon";

import ListTokenCommand from "../../../src/commands/tokens/list";
import { CommandArgs, CommandFailedResult, ErrorCodes } from "../../../src/util/commandline";
import { out } from "../../../src/util/interaction";

// Have to use `require` because of this: https://github.com/chalk/strip-ansi/issues/11
const stripAnsi = require("strip-ansi");

describe("Tokens List", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeDescription = "fakeDescription";
  const fakeId = "00000000-0000-0000-0000-000000000000";
  /* tslint:disable-next-line:no-http-string */
  const fakeHost = "http://localhost:1700";
  const testData = [
    {
      id: fakeId,
      test: fakeId,
      description: fakeDescription,
      scope: ["all"],
      created_at: "2020-04-28T15:59:29+0000",
    },
    {
      id: fakeId,
      created_at: "2020-04-28T15:59:29+0000",
      description: fakeDescription,
      scope: ["all"],
    },
    {
      id: fakeId,
      description: fakeDescription,
      scope: ["all"],
      created_at: "2020-04-28T15:59:29+0000",
    },
  ];

  const userTableData = [
    [fakeId, fakeDescription, "user", "2020-04-28T15:59:29+0000"],
    [fakeId, fakeDescription, "user", "2020-04-28T15:59:29+0000"],
    [fakeId, fakeDescription, "user", "2020-04-28T15:59:29+0000"],
  ];

  const appTableData = [
    [fakeId, fakeDescription, "app", "2020-04-28T15:59:29+0000"],
    [fakeId, fakeDescription, "app", "2020-04-28T15:59:29+0000"],
    [fakeId, fakeDescription, "app", "2020-04-28T15:59:29+0000"],
  ];

  let nockScope: Nock.Scope;
  let outTableStub: Sinon.SinonStub;

  before(() => {
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    outTableStub = Sinon.stub(out, "table");
    nockScope = Nock(fakeHost);
  });

  afterEach(() => {
    outTableStub.restore();
    Nock.cleanAll();
  });

  after(() => {
    Nock.enableNetConnect();
  });

  it("#list providing 'user' as type calls the user API", async () => {
    const getUserTokenUrl = `/v0.1/api_tokens`;

    nockScope.get(getUserTokenUrl).reply(200, testData);

    const command = new ListTokenCommand(getCommandArgs(["--type", "user"]));
    const result = await command.execute();

    // Assert
    const tableRows: string[][] = outTableStub.lastCall.args[1];
    expect(tableRows).to.be.an("array");
    const unchalkedRows: string[][] = tableRows.map((row) => row.map((element) => stripAnsi(element)));
    expect(outTableStub.calledOnce).to.be.true;
    expect(unchalkedRows).to.eql(userTableData);

    // Restore
    outTableStub.restore();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("#list providing no args succeeds in calling the default user API", async () => {
    const getUserTokenUrl = `/v0.1/api_tokens`;

    nockScope.get(getUserTokenUrl).reply(200, testData);

    const command = new ListTokenCommand(getCommandArgs([]));
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("#list providing app type calls the correct app list API", async () => {
    const getAppTokenUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/api_tokens`;

    nockScope.get(getAppTokenUrl).reply(200, testData);

    const command = new ListTokenCommand(getCommandArgsWithApp(["--type", "app"]));
    const result = await command.execute();

    // Assert
    const tableRows: string[][] = outTableStub.lastCall.args[1];
    expect(tableRows).to.be.an("array");
    const unchalkedRows: string[][] = tableRows.map((row) => row.map((element) => stripAnsi(element)));
    expect(outTableStub.calledOnce).to.be.true;
    expect(unchalkedRows).to.eql(appTableData);
    expect(result.succeeded).to.be.true;

    // Restore
    outTableStub.restore();
    nockScope.done();
  });

  it("#list providing invalid type parameter with error message", async () => {
    const expectedErrorMessage = "Provided token type is invalid. Should be one of: [user, app]";
    const command = new ListTokenCommand(getCommandArgsWithApp(["--type", "fake"]));

    const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;
    expect(result.succeeded).to.eql(false);
    expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
    expect(result.errorMessage).to.eql(expectedErrorMessage);

    nockScope.done();
  });

  function getCommandArgsWithApp(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["tokens", "list"],
      commandPath: "FAKE",
    };
  }

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["tokens", "list"],
      commandPath: "FAKE",
    };
  }
});
