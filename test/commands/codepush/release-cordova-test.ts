import * as Sinon from "sinon";
import * as Nock from "nock";
import CodePushReleaseCordovaCommand from "../../../src/commands/codepush/release-cordova";
import { CommandArgs } from "../../../src/util/commandline/command";
import { CommandFailedResult, CommandResult } from "../../../src/util/commandline/command-result";
import { expect } from "chai";
import * as which from "which";
import * as cp from "child_process";
import * as fs from "fs";

describe.only("Codepush release-cordova command", function () {
  const app = "bogus/app";
  const deployment = "bogus-deployment";
  let sandbox: Sinon.SinonSandbox;

  const goldenPathArgs: CommandArgs = {
    // prettier-ignore
    args: [
      "--target-binary-version", "1.0.0",
      "--is-release-build-type",
      "--build",
      "--rollout", "100",
      "--disable-duplicate-release-error",
      "--private-key-path", "fake/private-key-path",
      "--mandatory",
      "--disabled",
      "--description", "app description",
      "--deployment-name", deployment,
      "--app", app,
      "--token", "c1o3d3e7",
    ],
    command: ["codepush", "release-cordova"],
    commandPath: "fake/path",
  };

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    sandbox.stub(which, "sync").withArgs("cordova").returns("path/to/cordova");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("pass when all arguments are provided", async function () {
    // Arrange
    const os = "iOS";
    const command = new CodePushReleaseCordovaCommand(goldenPathArgs);
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
      os,
      platform: "cordova",
    });
    const execSyncStub = sandbox.stub(cp, "execSync");
    sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

    // Act
    const result = await command.execute();
    // Assert
    expect(result.succeeded).to.be.true;
    expect(execSyncStub.calledOnceWith(`cordova build --release ${os.toLowerCase()} --verbose`, Sinon.match.any)).true;
  });

  it("returns graceful error when deployment doesn't exists", async function () {
    // Arrange
    const command = new CodePushReleaseCordovaCommand(goldenPathArgs);
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(404, {});

    // Act
    const result = (await command.execute()) as CommandFailedResult;
    // Assert
    expect(result.succeeded).to.be.false;
    expect(result.errorMessage).to.equal(`Deployment "${deployment}" does not exist.`);
  });
  context("allowed OSes", function () {
    ["iOS", "Android"].forEach((os) =>
      it(`only iOS and Android allowed, check ${os}`, async function () {
        // Arrange
        const command = new CodePushReleaseCordovaCommand(goldenPathArgs);
        Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
        Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
          os,
          platform: "cordova",
        });
        sandbox.stub(cp, "execSync");
        sandbox.stub(fs, "existsSync").returns(true);
        sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

        // Act
        const result = await command.execute();
        // Assert
        expect(result.succeeded).to.be.true;
      })
    );
    it(`only iOS and Android allowed, check Windows`, async function () {
      // Arrange
      const os = "Windows";
      const command = new CodePushReleaseCordovaCommand(goldenPathArgs);
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os,
        platform: "cordova",
      });

      // Act
      const result = (await command.execute()) as CommandFailedResult;
      // Assert
      expect(result.succeeded).to.be.false;
      expect(result.errorMessage).to.equal('Platform must be either "ios" or "android".');
    });
  });
  it("fails the command if non cordova platform is returned for the app", function () {});
  it("reads the binary version from config.xml if not provided for the command", function () {});
  it("fails the command when semver incompatible binary version specified", function () {});
  context("cli Command", function () {
    context("command args", function () {
      it('defaults to "prepare"', function () {});
      context("when --build specified", function () {
        it('returns "build --release" for release build type', function () {});
        it('return "build" otherwise', function () {});
      });
    });
    context("executable", function () {
      it("tries to use cordova first", function () {});
      it("tries to use phonegap if no cordova found", function () {});
      it("fails the command if both cordova and phonegap are not installed", function () {});
    });
  });
  context("cordova output folder", function () {
    it("returns correct for iOS", function () {});
    it("returns cordova 7 compatible path for Android", function () {});
    it("returns pre cordova 7 path for Android (if no newer found)", function () {});
  });
});
