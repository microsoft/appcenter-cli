import { expect } from "chai";
import * as Nock from "nock";
import * as _ from "lodash";

import UpdateDistributionGroupCommand from "../../../../src/commands/distribute/groups/update";
import { CommandArgs, CommandResult } from "../../../../src/util/commandline";

describe("distribute groups update command", () => {
  const fakeAppOwner = "fakeAppOwner";
  const fakeAppName = "fakeAppName";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeToken = "c1o3d3e7";
  const fakeDistributionGroupName = "fakeDistributionGroupName";
  const updatedFakeDistributionGroupName = "updatedFakeDistributionGroupName";
  const fakeHost = "http://localhost:1700";

  before(() => {
    Nock.disableNetConnect();
  });

  it("throws an exception when trying to rename distribution group to name of other group which already exists in AppCenter", async () => {
    // Arrange
    let errorMessage: string;
    const executionScope = setupDistributionGroupFoundResponse(Nock(fakeHost));
    const skippedScope = _.flow(setupDistributionGroupNotFoundResponse, setupDistributionGroupUpdateResponse)(Nock(fakeHost));
    const expectedErrorMessage = `distribution group ${updatedFakeDistributionGroupName} already exists`;

    // Act
    const command = new UpdateDistributionGroupCommand(
      getCommandArgs(["-g", fakeDistributionGroupName, "-n", updatedFakeDistributionGroupName])
    );

    try {
      await command.execute();
    } catch (e) {
      errorMessage = e.errorMessage;
    }

    // Assert
    expect(errorMessage).to.eql(expectedErrorMessage, `Command should throw "${expectedErrorMessage}" exception`);
    testCommandFailure(executionScope, skippedScope);
  });

  it("renames distribution group when no distribution group with new name exists in AppCenter", async () => {
    // Arrange
    const executionScope = _.flow(setupDistributionGroupNotFoundResponse, setupDistributionGroupUpdateResponse)(Nock(fakeHost));
    const skippedScope = setupDistributionGroupFoundResponse(Nock(fakeHost));

    // Act
    const command = new UpdateDistributionGroupCommand(
      getCommandArgs(["-g", fakeDistributionGroupName, "-n", updatedFakeDistributionGroupName])
    );
    const result = await command.execute();

    // Assert
    testCommandSuccess(result, executionScope, skippedScope);
  });

  it("can rename a group and set its public status at the same time", async () => {
    // Arrange
    const newIsPublic = true;
    const executionScope = setupDistributionGroupNotFoundResponse(
      setupDistributionGroupUpdateNameAndPublicResponse(Nock(fakeHost), updatedFakeDistributionGroupName, newIsPublic)
    );
    const skippedScope = setupDistributionGroupFoundResponse(Nock(fakeHost));

    // Act
    const command = new UpdateDistributionGroupCommand(
      getCommandArgs(["-g", fakeDistributionGroupName, "-n", updatedFakeDistributionGroupName, "--public"])
    );
    const result = await command.execute();

    // Assert
    testCommandSuccess(result, executionScope, skippedScope);
  });

  it("doesn't change the public status of a group when neither related switches are provided", async () => {
    // Arrange
    const newIsPublic = true;
    const executionScope = setupDistributionGroupNotFoundResponse(
      setupDistributionGroupUpdateNameOnlyResponse(Nock(fakeHost), updatedFakeDistributionGroupName, newIsPublic)
    );
    const skippedScope = setupDistributionGroupFoundResponse(Nock(fakeHost));

    // Act
    const command = new UpdateDistributionGroupCommand(
      getCommandArgs(["-g", fakeDistributionGroupName, "-n", updatedFakeDistributionGroupName])
    );
    const result = await command.execute();

    // Assert
    testCommandSuccess(result, executionScope, skippedScope);
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  after(() => {
    Nock.enableNetConnect();
  });

  function testCommandSuccess(result: CommandResult, executionScope: Nock.Scope, abortScope?: Nock.Scope) {
    console.log(result);
    expect(result.succeeded).to.eql(true, "Command should be successfully completed");
    expect(abortScope.isDone()).to.eql(false, "Unexpected requests were made");
    executionScope.done(); // All normal API calls are executed
  }

  function testCommandFailure(executionScope: Nock.Scope, skippedScope?: Nock.Scope) {
    expect(skippedScope.isDone()).to.eql(false, "Unexpected requests were made");
    executionScope.done(); // All normal API calls are executed
  }

  function getCommandArgs(additionalArgs: string[]): CommandArgs {
    const args: string[] = ["-a", fakeAppIdentifier, "--token", fakeToken, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["distribute", "groups", "update"],
      commandPath: "FAKE_COMMAND_PATH",
    };
  }

  function setupDistributionGroupFoundResponse(nockScope: Nock.Scope) {
    return nockScope
      .get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${updatedFakeDistributionGroupName}`)
      .reply(200, {
        id: "7dbdfd81-342b-4a38-a4dd-d05379abe19d",
        name: updatedFakeDistributionGroupName,
        origin: "appcenter",
        display_name: updatedFakeDistributionGroupName,
        is_public: false,
      });
  }

  function setupDistributionGroupNotFoundResponse(nockScope: Nock.Scope) {
    return nockScope
      .get(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${updatedFakeDistributionGroupName}`)
      .reply(404, {
        error: {
          code: "NotFound",
          message: `Could not find distribution group with name ${updatedFakeDistributionGroupName}`,
        },
      });
  }

  function setupDistributionGroupUpdateResponse(nockScope: Nock.Scope) {
    return nockScope.patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}`).reply(200, {
      id: "7dbdfd81-342b-4a38-a4dd-d05379abe19d",
      name: updatedFakeDistributionGroupName,
      origin: "appcenter",
      display_name: updatedFakeDistributionGroupName,
      is_public: false,
    });
  }

  function setupDistributionGroupUpdateNameAndPublicResponse(nockScope: Nock.Scope, newName: string, newIsPublic: boolean) {
    return nockScope
      .log(console.log)
      .patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}`, {
        name: newName,
        is_public: newIsPublic,
      })
      .reply(200, {
        id: "7dbdfd81-342b-4a38-a4dd-d05379abe19d",
        name: newName,
        origin: "appcenter",
        display_name: newName,
        is_public: newIsPublic,
      });
  }

  function setupDistributionGroupUpdateNameOnlyResponse(nockScope: Nock.Scope, newName: string, newIsPublic: boolean) {
    return nockScope
      .log(console.log)
      .patch(`/v0.1/apps/${fakeAppOwner}/${fakeAppName}/distribution_groups/${fakeDistributionGroupName}`, {
        name: newName,
      })
      .reply(200, {
        id: "7dbdfd81-342b-4a38-a4dd-d05379abe19d",
        name: newName,
        origin: "appcenter",
        display_name: newName,
        is_public: newIsPublic,
      });
  }
});
