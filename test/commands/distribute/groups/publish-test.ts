import { expect } from "chai";
import * as Nock from "nock";
import * as Sinon from "sinon";

import PublishToGroupCommand from "../../../../src/commands/distribute/groups/publish";
import ReleaseBinaryCommand from "../../../../src/commands/distribute/release";
import { CommandArgs, CommandFailedResult, isCommandFailedResult, notFound } from "../../../../src/util/commandline";
import { FakeReleaseBinaryCommand } from "../fakes";

describe("distribute groups publish command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeFilePath = "/fake/file.ipa";
  const fakeGroupName = "myFakeGroup";
  const releaseNotes = "Fake release";
  const fakeReleaseNotesFile = "/fake/release_notes";
  const buildVersion = "123";
  const buildNumber = "1234";
  const fakeCommandPath = "fake/distribute/groups/publish.ts";
  const originalReleaseBinaryCommandPrototype = Object.getPrototypeOf(ReleaseBinaryCommand);

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
    Object.setPrototypeOf(ReleaseBinaryCommand, originalReleaseBinaryCommandPrototype);
  });

  after(() => {
    Nock.enableNetConnect();
  });

  it("passes all non-common parameters to distribute release", async () => {
    const command = new PublishToGroupCommand(
      getCommandArgs(["-b", buildVersion, "-n", buildNumber, "-r", releaseNotes, "-R", fakeReleaseNotesFile])
    );
    await command.execute();

    // Make sure it created a ReleaseBinaryCommand and ran it
    Sinon.assert.calledOnce(createReleaseStub);
    Sinon.assert.calledOnce(runReleaseStub);

    // Make sure all parameters were passed correctly to the aliased command, including the illegal combination of -r and -R
    const releaseCommand: FakeReleaseBinaryCommand = createReleaseStub.returnValues[0];
    expect(releaseCommand.app.identifier).equals(fakeAppIdentifier);
    expect(releaseCommand.filePath).equals(fakeFilePath);
    expect(releaseCommand.buildVersion).equals(buildVersion);
    expect(releaseCommand.buildNumber).equals(buildNumber);
    expect(releaseCommand.distributionGroup).equals(fakeGroupName);
    expect(releaseCommand.storeName).to.be.undefined;
    expect(releaseCommand.releaseNotes).equals(releaseNotes);
    expect(releaseCommand.releaseNotesFile).equals(fakeReleaseNotesFile);
  });

  it("returns the return value of 'distribute release'", async () => {
    const command = new PublishToGroupCommand(getCommandArgs(["-b", buildVersion, "-r", releaseNotes]));
    const result = await command.execute();

    expect(isCommandFailedResult(result)).to.be.true;
    expect((result as CommandFailedResult).errorMessage).to.equal("Command 42 not found");
  });

  it("returns the return value of 'distribute release'", async () => {
    const command = new PublishToGroupCommand(getCommandArgs(["-b", buildVersion, "-n", buildNumber, "-r", releaseNotes]));
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
      "-g",
      fakeGroupName,
      "--token",
      fakeToken,
      "--env",
      "local",
    ].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "groups", "publish"],
      commandPath: fakeCommandPath,
    };
  }
});
