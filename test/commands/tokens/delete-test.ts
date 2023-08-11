import * as Nock from "nock";
import * as Sinon from "sinon";
import { prompt } from "../../../src/util/interaction";

import DeleteTokenCommand from "../../../src/commands/tokens/delete";
import { CommandArgs, CommandFailedResult, ErrorCodes } from "../../../src/util/commandline";
import { localEndpoint as fakeHost } from "../../../src/util/misc/constants";

import * as chai from "chai";
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Tokens Delete", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  let inputStub: Sinon.SinonStub;
  let nockScope: Nock.Scope;

  before(() => {
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    inputStub = Sinon.stub(prompt, "confirm").resolves(true);
    nockScope = Nock(fakeHost);
  });

  afterEach(() => {
    inputStub.restore();
    Nock.cleanAll();
  });

  after(() => {
    Nock.enableNetConnect();
  });

  it("delete providing 'user' as type calls the user API", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const deleteUserTokenUrl = `/v0.1/api_tokens/${fakeId}`;

    nockScope.delete(deleteUserTokenUrl).reply(204, {});

    const command = new DeleteTokenCommand(getCommandArgs([fakeId, "--type", "user"]));
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("delete user type calls user API when description provided", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const deleteUserTokenUrl = `/v0.1/api_tokens/${fakeId}`;

    nockScope.delete(deleteUserTokenUrl).reply(204, {});

    const command = new DeleteTokenCommand(getCommandArgs([fakeId, "--type", "user"]));
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("delete providing no args calls the default user API", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const deleteUserTokenUrl = `/v0.1/api_tokens/${fakeId}`;

    nockScope.delete(deleteUserTokenUrl).reply(204, {});

    const command = new DeleteTokenCommand(getCommandArgs([fakeId]));
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("delete providing app type calls the app create API", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const deleteAppTokenUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/api_tokens/${fakeId}`;

    nockScope.delete(deleteAppTokenUrl).reply(204, {});

    const command = new DeleteTokenCommand(getCommandArgsWithApp([fakeId, "--type", "app"]));
    const result = await command.execute();

    expect(result.succeeded).to.be.true;

    nockScope.done();
  });

  it("delete providing app type calls fails when recieving 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const deleteAppTokenUrl = `/v0.1/apps/${fakeAppOwner}/${fakeAppName}/api_tokens/${fakeId}`;

    nockScope.delete(deleteAppTokenUrl).reply(404, {});

    const command = new DeleteTokenCommand(getCommandArgsWithApp([fakeId, "--type", "app"]));
    const result: CommandFailedResult = (await command.execute()) as CommandFailedResult;

    expect(result.succeeded).to.be.false;
    expect(result.errorCode).to.eql(ErrorCodes.NotLoggedIn);
    expect(result.errorMessage).to.eql(`the app API token with ID "${fakeId}" could not be found`);

    nockScope.done();
  });

  it("delete providing invalid type parameter fails", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const expectedErrorMessage = "Provided token type is invalid. Should be one of: [user, app]";
    const command = new DeleteTokenCommand(getCommandArgsWithApp([fakeId, "--type", "nope"]));
    const result = (await expect(command.execute()).to.eventually.be.rejected) as CommandFailedResult;

    expect(result.succeeded).to.eql(false);
    expect(result.errorCode).to.eql(ErrorCodes.InvalidParameter);
    expect(result.errorMessage).to.eql(expectedErrorMessage);

    nockScope.done();
  });

  function getCommandArgsWithApp(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["--token", fakeToken, "-a", fakeAppIdentifier, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["tokens", "delete"],
      commandPath: "FAKE",
    };
  }

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["tokens", "delete"],
      commandPath: "FAKE",
    };
  }
});
