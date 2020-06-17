import { assert } from "chai";
import * as Nock from "nock";
import * as Sinon from "sinon";

import OrgsAppsCreateCommand from "../../../../src/commands/orgs/apps/create";
import { out } from "../../../../src/util/interaction";
import { CommandArgs, CommandFailedResult } from "../../../../src/util/commandline";

describe("orgs apps create command", () => {
  const fakeOrgName = "ClandestineOrganization17";
  const fakeAppName = "fakeAppName";
  const fakeAppDisplayName = "Above Board Operations";
  const fakeAppDescription = "Lorem, lorem! Put words.";
  const fakeAppOs = "Android";
  const fakeAppPlatform = "Java";
  const fakeAppReleaseType = "Gamma";
  const fakeHost = "http://localhost:1700";
  const fakeOrgId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
  const fakeOrgEmail = "info@fake.org";
  const fakeToken = "fd6327f9-198c-4161-8127-dd445b727601";

  const orgsAppCreateUrl = `/v0.1/orgs/${fakeOrgName}/apps`;

  // The name formatting is that returned by the method we call, not the API itself (that uses underscores)
  const fakeAppResponse = {
    description: fakeAppDescription,
    name: fakeAppName,
    os: fakeAppOs,
    owner: {
      id: fakeOrgId,
      email: fakeOrgEmail,
      name: fakeOrgName,
      type: "org",
    },
    platform: fakeAppPlatform,
  };

  let sandbox: Sinon.SinonSandbox;
  let reportStub: Sinon.SinonStub;
  let nockScope: Nock.Scope;

  const command = getOrgsAppsCreateCommand(
    `--org-name ${fakeOrgName} --app-name ${fakeAppName} --os ${fakeAppOs} --platform ${fakeAppPlatform} --release-type ${fakeAppReleaseType}`,
    ["--description", fakeAppDescription, "--display-name", fakeAppDisplayName]
  );

  before(() => {
    sandbox = Sinon.createSandbox();
    Nock.disableNetConnect();
  });

  beforeEach(() => {
    reportStub = sandbox.stub(out, "report");
    nockScope = Nock(fakeHost);
  });

  afterEach(() => {
    nockScope.done();
    sandbox.restore();
    Nock.cleanAll();
  });

  after(() => {
    Nock.enableNetConnect();
  });

  describe("when creating an app with all valid settings", () => {
    beforeEach(() => {
      nockScope
        .post(orgsAppCreateUrl, {
          description: fakeAppDescription,
          release_type: fakeAppReleaseType,
          display_name: fakeAppDisplayName,
          name: fakeAppName,
          os: fakeAppOs,
          platform: fakeAppPlatform,
        })
        .reply(200, fakeAppResponse);
    });

    it("reports the command as succeeded", async () => {
      const result = await command.execute();

      assert(result.succeeded, `Result should be success. Got result: ${JSON.stringify(result)}`);
    });

    it("writes out the app details", async () => {
      await command.execute();

      Sinon.assert.calledWithMatch(reportStub, Sinon.match.any, fakeAppResponse);
    });
  });

  describe("when status 404 is returned", () => {
    beforeEach(() => {
      nockScope.post(orgsAppCreateUrl).reply(404, { error: { code: "NotFound", message: "Some error" } });
    });

    it("fails", async () => {
      const result = await command.execute();

      assert.isFalse(result.succeeded);
    });

    it("reports the org doesn't exist", async () => {
      const result = (await command.execute()) as CommandFailedResult;
      assert.equal(result.errorMessage, "there appears to be no such org");
    });
  });

  describe("when status 409 is returned", () => {
    beforeEach(() => {
      nockScope.post(orgsAppCreateUrl).reply(409, { error: { code: "Conflict", message: "Some error" } });
    });

    it("fails", async () => {
      const result = await command.execute();

      assert.isFalse(result.succeeded);
    });

    it("reports another app with the same name already exists", async () => {
      const result = (await command.execute()) as CommandFailedResult;
      assert.equal(result.errorMessage, "an app with this 'name' already exists");
    });
  });

  function getOrgsAppsCreateCommand(parameters: string, whitespaceParameters?: string[]): OrgsAppsCreateCommand {
    const cliArgs: string[] = parameters.split(" ").concat(whitespaceParameters).concat("--env", "local", "--token", fakeToken);
    const constructorArgs: CommandArgs = {
      args: cliArgs,
      command: ["orgs", "apps", "create"],
      commandPath: "FAKE",
    };
    return new OrgsAppsCreateCommand(constructorArgs);
  }
});
