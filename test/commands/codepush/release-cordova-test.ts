import * as Sinon from "sinon";
import * as Nock from "nock";
import CodePushReleaseCordovaCommand from "../../../src/commands/codepush/release-cordova";
import { CommandArgs } from "../../../src/util/commandline/command";
import { CommandFailedResult, CommandResult } from "../../../src/util/commandline/command-result";
import { expect } from "chai";
import * as which from "which";
import * as cp from "child_process";
import * as fs from "fs";
import * as validationUtils from "../../../src/commands/codepush/lib/validation-utils";
import * as path from "path";
import { getFakeParamsForRequest } from "./utils";

describe("codepush release-cordova command", function () {
  const app = "bogus/app";
  const deployment = "bogus-deployment";
  let sandbox: Sinon.SinonSandbox;
  let whichSyncStub: Sinon.SinonStub;

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
      "--token", getFakeParamsForRequest().token
    ],
    command: ["codepush", "release-cordova"],
    commandPath: "fake/path",
  };

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    whichSyncStub = sandbox.stub(which, "sync").withArgs("cordova", null).returns("path/to/cordova");
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
  it("fails the command if non cordova platform is returned for the app", async function () {
    // Arrange
    const command = new CodePushReleaseCordovaCommand(goldenPathArgs);
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
      os: "iOS",
      platform: "React-Native",
    });

    // Act
    const result = (await command.execute()) as CommandFailedResult;
    // Assert
    expect(result.succeeded).to.be.false;
    expect(result.errorMessage).to.equal('Platform must be "Cordova".');
  });
  it("reads the binary version from config.xml if not provided for the command", async function () {
    // Arrange
    const os = "iOS";
    const version = "1.0.0";
    // prettier-ignore
    const args: CommandArgs = {
      ...goldenPathArgs,
      args: [
        "--deployment-name", deployment,
        "--app", app,
        "--token", "c1o3d3e7",
      ],
    };
    const command = new CodePushReleaseCordovaCommand(args);
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
      os,
      platform: "cordova",
    });
    sandbox.stub(cp, "execSync");
    const originalReadFileSync = fs.readFileSync;
    sandbox.stub(fs, "readFileSync").callsFake(function (path: fs.PathLike) {
      if (typeof path === "string" && /.*config.xml/.test(path)) {
        return `
          <?xml version="v${version}" encoding="utf-8"?>
          <widget id="com.example.test" version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
          </widget>
        `;
      } else {
        return originalReadFileSync.apply(this, arguments);
      }
    });
    sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
    const validSpy = sandbox.spy(validationUtils, "isValidRange");

    // Act
    const result = await command.execute();
    // Assert
    expect(result.succeeded).to.be.true;
    expect(validSpy.calledOnceWith(version)).to.be.true;
  });
  it("fails the command when semver incompatible binary version specified", async function () {
    // Arrange
    const os = "iOS";
    // prettier-ignore
    const args: CommandArgs = {
      ...goldenPathArgs,
      args: [
        "--deployment-name", deployment,
        "--app", app,
        "--token", "c1o3d3e7",
        "--target-binary-version", "invalidVersion",
      ],
    };
    const command = new CodePushReleaseCordovaCommand(args);
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
      os,
      platform: "cordova",
    });

    // Act
    const result = (await command.execute()) as CommandFailedResult;
    // Assert
    expect(result.succeeded).to.be.false;
    expect(result.errorMessage).to.equal("Invalid binary version(s) for a release.");
  });
  context("cli Command", function () {
    context("command args", function () {
      it('defaults to "prepare"', async function () {
        // Arrange
        const os = "iOS";
        // prettier-ignore
        const args: CommandArgs = {
          ...goldenPathArgs,
          args: [
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
            "--target-binary-version", "1.0.0",
          ],
        };
        const command = new CodePushReleaseCordovaCommand(args);
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
        expect(execSyncStub.calledOnceWith(`cordova prepare ${os.toLowerCase()} --verbose`, Sinon.match.any)).true;
      });
      context("when --build specified", function () {
        it('returns "build --release" for release build type', async function () {
          // Arrange
          const os = "iOS";
          // prettier-ignore
          const args: CommandArgs = {
          ...goldenPathArgs,
          args: [
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
            "--target-binary-version", "1.0.0",
            "--build",
            "--is-release-build-type",
          ],
        };
          const command = new CodePushReleaseCordovaCommand(args);
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
        it('return "build" otherwise', async function () {
          // Arrange
          const os = "iOS";
          // prettier-ignore
          const args: CommandArgs = {
          ...goldenPathArgs,
          args: [
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
            "--target-binary-version", "1.0.0",
            "--build"
          ],
        };
          const command = new CodePushReleaseCordovaCommand(args);
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
          expect(execSyncStub.calledOnceWith(`cordova build ${os.toLowerCase()} --verbose`, Sinon.match.any)).true;
        });
      });
    });
    context("executable", function () {
      it("tries to use cordova first", async function () {
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
        expect(execSyncStub.getCalls()[0].args[0].startsWith("cordova")).to.be.true;
      });
      it("tries to use phonegap if no cordova found", async function () {
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
        whichSyncStub.withArgs("cordova").throws();

        // Act
        const result = await command.execute();
        // Assert
        expect(result.succeeded).to.be.true;
        expect(execSyncStub.getCalls()[0].args[0].startsWith("phonegap")).to.be.true;
      });
      it("fails the command if both cordova and phonegap are not installed", async function () {
        // Arrange
        const os = "iOS";
        const command = new CodePushReleaseCordovaCommand(goldenPathArgs);
        Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
        Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
          os,
          platform: "cordova",
        });
        sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
        whichSyncStub.withArgs("cordova").throws();
        whichSyncStub.withArgs("phonegap").throws();

        // Act
        const result = (await command.execute()) as CommandFailedResult;
        // Assert
        expect(result.succeeded).to.be.false;
        expect(result.errorMessage).match(
          /Unable to .* project\. Please ensure that either the Cordova or PhoneGap CLI is installed\./
        );
      });
    });
  });
  context("cordova output folder", function () {
    it("returns correct for iOS", async function () {
      // Arrange
      const os = "iOS";
      const iosPath = path.join("platforms", os.toLowerCase(), "www").replace(/\\/g, "\\\\");
      const command = new CodePushReleaseCordovaCommand(goldenPathArgs);
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os,
        platform: "cordova",
      });
      sandbox.stub(cp, "execSync");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

      // Act
      const result = await command.execute();
      // Assert
      expect(result.succeeded).to.be.true;
      expect((command as any).updateContentsPath).to.match(new RegExp(iosPath));
    });
    it("returns cordova 7 compatible path for Android", async function () {
      // Arrange
      const os = "Android";
      const androidPath = path.join("platforms", os.toLowerCase(), "app", "src", "main", "assets", "www").replace(/\\/g, "\\\\");
      const command = new CodePushReleaseCordovaCommand(goldenPathArgs);
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os,
        platform: "cordova",
      });
      sandbox.stub(cp, "execSync");
      const existsStub = sandbox.stub(fs, "existsSync");
      existsStub.returns(true);
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

      // Act
      const result = await command.execute();
      // Assert
      expect(result.succeeded).to.be.true;
      expect((command as any).updateContentsPath).to.match(new RegExp(androidPath));
    });
    it("returns pre cordova 7 path for Android (if no newer found)", async function () {
      // Arrange
      const os = "Android";
      const androidPathCordova7 = path
        .join("platforms", os.toLowerCase(), "app", "src", "main", "assets", "www")
        .replace(/\\/g, "\\\\");
      const androidPath = path.join("platforms", os.toLowerCase(), "assets", "www").replace(/\\/g, "\\\\");
      const command = new CodePushReleaseCordovaCommand(goldenPathArgs);
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os,
        platform: "cordova",
      });
      sandbox.stub(cp, "execSync");
      const existsStub = sandbox.stub(fs, "existsSync");
      existsStub.returns(true);
      existsStub.withArgs(Sinon.match(new RegExp(androidPathCordova7))).returns(false);
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

      // Act
      const result = await command.execute();
      // Assert
      expect(result.succeeded).to.be.true;
      expect((command as any).updateContentsPath).to.match(new RegExp(androidPath));
    });
  });
});
