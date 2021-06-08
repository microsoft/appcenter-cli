import * as Sinon from "sinon";
import * as Nock from "nock";
import { expect } from "chai";

import { CommandArgs, CommandFailedResult, isCommandFailedResult, notFound } from "../../../../src/util/commandline";
import PublishToStoreCommand from "../../../../src/commands/distribute/stores/publish";
import ReleaseBinaryCommand from "../../../../src/commands/distribute/release";
import { FakeReleaseBinaryCommand } from "../fakes";

describe("distribute stores publish command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeFilePath = "/fake/file.ipa";
  const fakeStoreName = "myFakeStore";
  const releaseNotes = "Fake release";
  const fakeReleaseNotesFile = "/fake/release_notes";
  const fakeCommandPath = "fake/distribute/groups/publish.ts";
  const environment = "local";

  let sandbox: Sinon.SinonSandbox;
  let createReleaseStub: Sinon.SinonStub;
  let runReleaseStub: Sinon.SinonStub;

  before(() => {
    sandbox = Sinon.createSandbox();

    // Just to be safe
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    runReleaseStub = sandbox.stub(FakeReleaseBinaryCommand.prototype, "run");
    runReleaseStub.returns(notFound("42"));
    createReleaseStub = sandbox.stub().callsFake((args) => {
      return new FakeReleaseBinaryCommand(args);
    });
    Object.setPrototypeOf(ReleaseBinaryCommand, createReleaseStub);
  });

  afterEach(() => {
    sandbox.restore();
  });

  after(() => {
    Nock.enableNetConnect();
  });

  it("passes all appropriate parameters to distribute release", async () => {
    const command = new PublishToStoreCommand(getCommandArgs(["-r", releaseNotes, "-R", fakeReleaseNotesFile, "--disable-telemetry"]));
    await command.execute();

    // Make sure it created a ReleaseBinaryCommand and ran it
    Sinon.assert.calledOnce(createReleaseStub);
    Sinon.assert.calledOnce(runReleaseStub);

    // Make sure all parameters were passed correctly to the aliased command, including the illegal combination of -r and -R
    const releaseCommand: FakeReleaseBinaryCommand = createReleaseStub.returnValues[0];
    expect(releaseCommand.app.identifier).equals(fakeAppIdentifier);
    expect(releaseCommand.filePath).equals(fakeFilePath);
    expect(releaseCommand.distributionGroup).to.be.undefined;
    expect(releaseCommand.storeName).equals(fakeStoreName);
    expect(releaseCommand.releaseNotes).equals(releaseNotes);
    expect(releaseCommand.releaseNotesFile).equals(fakeReleaseNotesFile);
    expect(releaseCommand.token).equals(fakeToken);
    expect(releaseCommand.environmentName).equals(environment);
    expect(releaseCommand.disableTelemetry).to.be.true;
  });

  it("returns the return value of 'distribute release'", async () => {
    const command = new PublishToStoreCommand(getCommandArgs(["-r", releaseNotes]));
    const result = await command.execute();

    expect(isCommandFailedResult(result)).to.be.true;
    expect((result as CommandFailedResult).errorMessage).to.equal("Command 42 not found");
  });

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = [
      "-a",
      fakeAppIdentifier,
      "-f",
      fakeFilePath,
      "-s",
      fakeStoreName,
      "--token",
      fakeToken,
      "--env",
      environment,
    ].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "stores", "publish"],
      commandPath: fakeCommandPath,
    };
  }
});
