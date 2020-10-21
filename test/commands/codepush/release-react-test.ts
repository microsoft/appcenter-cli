import * as fs from "fs";
import { expect } from "chai";
import * as Sinon from "sinon";
import * as Nock from "nock";
import CodePushReleaseReactCommand from "../../../src/commands/codepush/release-react";
import { CommandArgs } from "../../../src/util/commandline/command";
import * as mkdirp from "mkdirp";
import * as ReactNativeTools from "../../../src/commands/codepush/lib/react-native-utils";
import * as fileUtils from "../../../src/commands/codepush/lib/file-utils";
import { CommandFailedResult, CommandResult } from "../../../src/util/commandline";
import * as updateContentsTasks from "../../../src/commands/codepush/lib/update-contents-tasks";

describe.only("CodePush release-react command", function () {
  const app = "bogus/app";
  const deployment = "bogus-deployment";
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    sandbox.stub(updateContentsTasks, "sign");
  });

  afterEach(() => {
    sandbox.restore();
  });
  const goldenPathArgs: CommandArgs = {
    // prettier-ignore
    args: [
      "--extra-hermes-flag", "bogusGermes",
      "--extra-bundler-option", "bogusRnBundle",
      "--target-binary-version", "1.0.0",
      "--output-dir", "fake/out/dir",
      "--sourcemap-output-dir", "fake/sourcemap/output",
      "--sourcemap-output", "sourceMapOutput.txt",
      "--build-configuration-name", "Release",
      "--plist-file-prefix", "",
      "--plist-file", "",
      "--gradle-file", "bogusApp/app.gradle",
      "--entry-file", "entry.js",
      "--development",
      "--bundle-name", "bundle",
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
    command: ["codepush", "release-react"],
    commandPath: "fake/path",
  };
  it("succeed if all parameters are passed", async function () {
    // Arrange
    const command = new CodePushReleaseReactCommand(goldenPathArgs);
    sandbox.stub(fs, "readFileSync").returns(`
    {
      "name": "RnCodepushAndroid",
      "version": "0.0.1",
      "dependencies": {
        "react": "16.13.1",
        "react-native": "0.63.3",
        "react-native-code-push": "6.3.0"
      }
    }
    `);

    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
      os: "iOS",
      platform: "react-native",
    });
    sandbox.stub(mkdirp, "sync");

    sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
    sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
    sandbox.stub(fileUtils, "removeReactTmpDir");
    sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
    sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

    // Act
    const result = await command.execute();
    // Assert
    expect(result.succeeded).to.be.true;
  });

  it.skip("npm package should have name defined check", async function () {
    // Arrange
    const command = new CodePushReleaseReactCommand(goldenPathArgs);
    sandbox.stub(fs, "readFileSync").returns(`
        {
          "version": "0.0.1",
          "dependencies": {
            "react": "16.13.1",
            "react-native": "0.63.3",
            "react-native-code-push": "6.3.0"
          }
        }
      `);

    // Act
    const result = command.execute();

    // Assert
    return expect(result).to.eventually.be.rejectedWith('The "package.json" file in the CWD does not have the "name" field set.');
  });

  context("react-native dependency", function () {
    it("throws error if no react native in dependencies and devDependencies", async function () {
      // Arrange
      const command = new CodePushReleaseReactCommand(goldenPathArgs);
      sandbox.stub(fs, "readFileSync").returns(`
        {
          "name": "RnCodepushAndroid",
          "version": "0.0.1",
          "dependencies": {
            "react": "16.13.1",
            "react-native-code-push": "6.3.0"
          }
        }
      `);

      // Act
      const result = (await command.execute()) as CommandFailedResult;

      // Assert
      expect(result.succeeded).to.be.false;
      expect(result.errorMessage).to.equal("The project in the CWD is not a React Native project.");
    });

    it("finishes to end if react-native specified in dependencies ", async function () {
      // Arrange
      const command = new CodePushReleaseReactCommand(goldenPathArgs);
      sandbox.stub(fs, "readFileSync").returns(`
    {
      "name": "RnCodepushAndroid",
      "version": "0.0.1",
      "dependencies": {
        "react": "16.13.1",
        "react-native": "0.63.3",
        "react-native-code-push": "6.3.0"
      }
    }
    `);

      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os: "iOS",
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");

      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(fileUtils, "removeReactTmpDir");
      sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

      // Act
      const result = await command.execute();
      // Assert
      expect(result.succeeded).to.be.true;
    });

    it("finishes to end if react-native specified in devDependencies ", async function () {
      // Arrange
      const command = new CodePushReleaseReactCommand(goldenPathArgs);
      sandbox.stub(fs, "readFileSync").returns(`
    {
      "name": "RnCodepushAndroid",
      "version": "0.0.1",
      "dependencies": {
        "react": "16.13.1",
        "react-native-code-push": "6.3.0"
      },
      "devDependencies": {
        "react-native": "0.63.3"
      }
    }
    `);

      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os: "iOS",
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");

      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(fileUtils, "removeReactTmpDir");
      sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

      // Act
      const result = await command.execute();
      // Assert
      expect(result.succeeded).to.be.true;
    });
  });
  it("when incorrect deployment name specifed, the error is pretty formatted", function () {});
  context("when no output dir parameter specified, then temporarily directory is created", function () {
    it("CodePush directory is created within, so that it was compatible with SDK", function () {});
    it("temporary directory is get removed once command finishes", function () {});
  });
  it("only android, ios and windows OSes are allowed (check the API response)", function () {});
  it("only react-native platform is allowed ", function () {});
  context("bundle name if not provided defaults", function () {
    it("ios", function () {});
    it("another platform", function () {});
  });
  context("entry file", function () {
    context("if not specified", function () {
      it("then defaults to index.os.js", function () {});
      it("and fallback to index.js", function () {});
      it("error thrown if nothing found", function () {});
    });
    it("if specified error thrown if not found", function () {});
  });
  it("if sourcemapOutput not specified it but there is outputDir or sourcemapdir, then it guessing for some value", function () {});
  context("targetBinaryVersion", function () {
    it("if specified should be in valid range", function () {});
    it("if not specified, then set to fallback", function () {});
  });
  it("reactTmpDir is removed", function () {});
  context("hermes", function () {
    it("does work only for android", function () {});
    it("hermes enabled only when specified in the app gradle file", function () {});
    context("RN versions", function () {
      it("works for starting with caret", function () {});
      it("works for custom (like 'mobiletechvn/react-native#v0.63.2.fix-shadow-node')", function () {});
    });
  });
});
