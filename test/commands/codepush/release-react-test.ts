import { expect } from "chai";
import * as Sinon from "sinon";
import * as Nock from "nock";
import CodePushReleaseReactCommand from "../../../src/commands/codepush/release-react";
import { CommandArgs } from "../../../src/util/commandline/command";
import * as fs from "fs";

describe.only("CodePush release-react command", function () {
  const app = "bogus/app";
  const deployment = "bogus-deployment";
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
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
      //"--plist-file-prefix", "",
      //"--plist-file", "",
      "--gradle-file", "bogusApp/app.gradle",
      "--entry-file","entry.js",
      "--development",
      "--bundle-name", "bundle",
      "--rollout", "100",
      "--disable-duplicate-release-error",
      "--private-key-path", "fake/private-key-path",
      "--mandatory",
      "--disabled",
      "--description", "app description",
      "--deployment-name", ,
      "--app", app
    ],
    command: ["codepush", "release-react"],
    commandPath: "fake/path",
  };
  it("succeed if all parameters are passed", async function () {
    // Arrange
    const command = new CodePushReleaseReactCommand(goldenPathArgs);
    const readFileSyncStub = sandbox.stub(fs, "readFileSync");
    readFileSyncStub.returns(`
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
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).query(true).reply(200, {});
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).query(true).reply(200, {
      os: "Android",
      platform: "react-native",
    });
    // Act
    const result = await command.execute();
    // Assert
    expect(result.succeeded).to.be.true;
  });
  it("npm package should have name defined check", function () {});
  context("react-native dependency", function () {
    it("in dependencies", function () {
      // Arrange
      // const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
      // nockPlatformRequest("React-Native", fakeParamsForRequests, nockedApiGatewayRequests);
      // const args: CommandArgs = getCommandArgsForReleaseCommand(
      //   ["-c", releaseFilePath, "-k", "fakePrivateKey.pem"],
      //   fakeParamsForRequests
      // );
      // // Act
      // const testRelaseSkeleton = new CodePushReleaseCommand(args);
      // const result = await testRelaseSkeleton.execute();
      // // Assert
      // console.dir(util.inspect(result));
      // expect(result.succeeded).to.be.true;
      // const lastFolderForSignPath = getLastFolderForSignPath(stubbedSign);
      // expect(lastFolderForSignPath).to.eql("CodePush", "Last folder in path should be 'CodePush'");
      // nockedApiGatewayRequests.done();
    });
    it("in dev dependencies", function () {});
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
