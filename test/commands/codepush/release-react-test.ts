import * as fs from "fs";
import * as path from "path";
import * as osLib from "os";
import * as cp from "child_process";
import * as events from "events";
import { expect } from "chai";
import * as Sinon from "sinon";
import * as Nock from "nock";
import * as pfs from "../../../src/util/misc/promisfied-fs";
import CodePushReleaseReactCommand from "../../../src/commands/codepush/release-react";
import { CommandArgs } from "../../../src/util/commandline/command";
import * as mkdirp from "mkdirp";
import * as ReactNativeTools from "../../../src/commands/codepush/lib/react-native-utils";
import * as fileUtils from "../../../src/commands/codepush/lib/file-utils";
import { CommandFailedResult, CommandResult } from "../../../src/util/commandline";
import * as updateContentsTasks from "../../../src/commands/codepush/lib/update-contents-tasks";
import rimraf = require("rimraf");
const g2js = require("gradle-to-js/lib/parser");

describe("codepush release-react command", function () {
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
      "--extra-hermes-flag", "bogusHermes",
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

  it("npm package should have name defined check", async function () {
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
  it("shows user friendly error when incorrect deployment specified", async function () {
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

    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(404, {});

    // Act
    const result = (await command.execute()) as CommandFailedResult;
    // Assert
    expect(result.succeeded).to.be.false;
    expect(result.errorMessage).to.be.equal(`Deployment "${deployment}" does not exist.`);
  });
  context("when no output dir parameter specified, then temporarily directory is created", function () {
    it("creates CodePush directory, so that it was compatible with SDK", async function () {
      // Arrange
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
            "--target-binary-version", "1.0.0",
            "--bundle-name", "bundle",
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
          ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
        os: "Android",
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(fileUtils, "removeReactTmpDir");
      sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      const mkTempDirStub = sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

      // Act
      await command.execute();

      // Assert
      sandbox.assert.calledWithExactly(mkTempDirStub, "code-push");
    });

    it("temporary directory is get removed once command finishes", async function () {
      // Arrange
      const fakePath = "fake/path/code-push";
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
                  "--target-binary-version", "1.0.0",
                  "--bundle-name", "bundle",
                  "--deployment-name", deployment,
                  "--app", app,
                  "--token", "c1o3d3e7",
                ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
        os: "Android",
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(fileUtils, "removeReactTmpDir");
      sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      sandbox.stub(pfs, "mkTempDir").resolves(fakePath);
      const rmDirSpy = sandbox.spy(pfs, "rmDir");

      // Act
      await command.execute();

      // Assert
      sandbox.assert.calledOnceWithExactly(rmDirSpy, path.join(fakePath, "CodePush"));
    });
  });

  ["Android", "iOS", "Windows"].forEach((os: string) => {
    it(`only android, ios and windows OSes are allowed (check the API response) - check ${os}`, async function () {
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
        os,
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(fileUtils, "removeReactTmpDir");
      sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(ReactNativeTools, "getHermesEnabled").resolves(false);
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

      // Act
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.true;
    });
  });

  it("throws an error if non react-native platform specified", async function () {
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
      platform: "objective-c",
    });

    // Act
    const result = await command.execute();
    // Assert
    expect(result.succeeded).to.be.false;
  });
  context("bundle name defaults", function () {
    it("set correct bundle name for ios", async function () {
      // Arrange
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
            "--target-binary-version", "1.0.0",
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
          ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
      const rnBundleStub = sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

      // Act
      await command.execute();

      // Assert
      expect(rnBundleStub.getCalls()[0].args[0]).to.be.equal("main.jsbundle");
    });
    it("another platform", async function () {
      const os = "Android";
      // Arrange
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
            "--target-binary-version", "1.0.0",
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
          ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
        os,
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(fileUtils, "removeReactTmpDir");
      const rnBundleStub = sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

      // Act
      await command.execute();

      // Assert
      expect(rnBundleStub.getCalls()[0].args[0]).to.be.equal(`index.${os.toLowerCase()}.bundle`);
    });
  });
  context("entry file", function () {
    context("if not specified", function () {
      it("then defaults to index.{os}.js", async function () {
        const os = "Android";
        // Arrange
        const args = {
          ...goldenPathArgs,
          // prettier-ignore
          args: [
            "--target-binary-version", "1.0.0",
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
          ],
        };
        const command = new CodePushReleaseReactCommand(args);
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
          os,
          platform: "react-native",
        });
        sandbox.stub(mkdirp, "sync");
        sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
        sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
        sandbox.stub(fileUtils, "removeReactTmpDir");
        const rnBundleStub = sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
        sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
        sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

        // Act
        await command.execute();

        // Assert
        expect(rnBundleStub.getCalls()[0].args[2]).to.be.equal(`index.${os.toLowerCase()}.js`);
      });
      it("and fallback to index.js", async function () {
        const os = "Android";
        // Arrange
        const args = {
          ...goldenPathArgs,
          // prettier-ignore
          args: [
            "--target-binary-version", "1.0.0",
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
          ],
        };
        const command = new CodePushReleaseReactCommand(args);
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
          os,
          platform: "react-native",
        });
        sandbox.stub(mkdirp, "sync");
        const firstAttemptEntryFileName = `index.${os.toLowerCase()}.js`;
        sandbox.replace(fileUtils, "fileDoesNotExistOrIsDirectory", (path) => path === firstAttemptEntryFileName);
        sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
        sandbox.stub(fileUtils, "removeReactTmpDir");
        const rnBundleStub = sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
        sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
        sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

        // Act
        await command.execute();

        // Assert
        expect(rnBundleStub.getCalls()[0].args[2]).to.be.equal("index.js");
      });
      it("fails command if no file found", async function () {
        const os = "Android";
        // Arrange
        const args = {
          ...goldenPathArgs,
          // prettier-ignore
          args: [
            "--target-binary-version", "1.0.0",
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
          ],
        };
        const command = new CodePushReleaseReactCommand(args);
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
          os,
          platform: "react-native",
        });
        sandbox.stub(mkdirp, "sync");
        const firstAttemptEntryFileName = `index.${os.toLowerCase()}.js`;
        const secondAttemptEntryFileName = "index.js";
        sandbox.replace(fileUtils, "fileDoesNotExistOrIsDirectory", (path) => {
          return path === firstAttemptEntryFileName || path === secondAttemptEntryFileName;
        });

        // Act
        const result = await command.execute();

        // Assert
        expect(result.succeeded).to.be.false;
      });
    });
    it("fails the command if entry file specified is not found", async function () {
      // Arrange
      const entryFile = "bogusEntryFile";
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
            "--target-binary-version", "1.0.0",
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
            "--entry-file", entryFile
          ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
        os: "Android",
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      const fileNotExistStub = sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(true);

      // Act
      const result = await command.execute();

      // Assert
      expect(fileNotExistStub.calledWithExactly(entryFile)).to.be.true;
      expect(result.succeeded).to.be.false;
    });
  });
  it("composes sourcemapOutput when --sourcemap-output parameter is not provided", async function () {
    const os = "Android";
    const bundleName = "bogus.bundle";
    const sourcemapOutputDir = "/fake/dir";
    // Arrange
    const args = {
      ...goldenPathArgs,
      // prettier-ignore
      args: [
        "--sourcemap-output-dir", sourcemapOutputDir,
        "--bundle-name", bundleName,
        "--target-binary-version", "1.0.0",
        "--deployment-name", deployment,
        "--app", app,
        "--token", "c1o3d3e7",
      ],
    };
    const command = new CodePushReleaseReactCommand(args);
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
      os,
      platform: "react-native",
    });
    sandbox.stub(mkdirp, "sync");
    sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
    sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
    sandbox.stub(fileUtils, "removeReactTmpDir");
    const rnBundleStub = sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
    sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
    sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

    // Act
    await command.execute();

    // Assert
    expect(rnBundleStub.getCalls()[0].args[5]).to.be.equal(path.join(sourcemapOutputDir, `${bundleName}.map`));
  });
  context("targetBinaryVersion", function () {
    it("fails if targetBinaryVersion is not in valid range", async function () {
      const os = "Android";
      // Arrange
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
          "--target-binary-version", "invalid-range",
          "--deployment-name", deployment,
          "--app", app,
          "--token", "c1o3d3e7",
        ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
        os,
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(fileUtils, "removeReactTmpDir");

      // Act
      const result = (await command.execute()) as CommandFailedResult;

      // Assert
      expect(result.errorMessage).to.be.equal("Invalid binary version(s) for a release.");
      expect(result.succeeded).to.be.false;
    });
    it("sets targetBinaryVersion from project settings if not specified", async function () {
      const os = "Android";
      // Arrange
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
          "--deployment-name", deployment,
          "--app", app,
          "--token", "c1o3d3e7",
        ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
        os,
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(fileUtils, "removeReactTmpDir");
      const fallback = sandbox.stub(ReactNativeTools, "getReactNativeProjectAppVersion");
      sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

      // Act
      await command.execute();

      // Assert
      Sinon.assert.called(fallback);
    });
  });
  it("removes temporary RN directory", async function () {
    const os = "Android";
    // Arrange
    const args = {
      ...goldenPathArgs,
      // prettier-ignore
      args: [
        "--target-binary-version", "1.0.0",
        "--deployment-name", deployment,
        "--app", app,
        "--token", "c1o3d3e7",
      ],
    };
    const command = new CodePushReleaseReactCommand(args);
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
      os,
      platform: "react-native",
    });
    sandbox.stub(mkdirp, "sync");
    sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
    sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
    sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
    sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
    sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");
    const syncStub = sandbox.stub(rimraf, "sync");

    // Act
    await command.execute();

    // Assert
    Sinon.assert.calledOnceWithExactly(syncStub, `${osLib.tmpdir()}/react-*`);
  });
  context("hermes", function () {
    it("skipped for non-android platforms", async function () {
      const os = "ios";
      // Arrange
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
          "--target-binary-version", "1.0.0",
          "--deployment-name", deployment,
          "--app", app,
          "--token", "c1o3d3e7",
        ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
        os,
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      sandbox.stub(fileUtils, "removeReactTmpDir");
      sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      const runHermesEmitBinaryCommandStub = sandbox.stub(ReactNativeTools, "runHermesEmitBinaryCommand");

      // Act
      await command.execute();

      // Assert
      expect(runHermesEmitBinaryCommandStub.notCalled).is.true;
    });
    it("hermes enabled only when specified in the app gradle file", async function () {
      const os = "Android";
      // Arrange
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
            "--target-binary-version", "1.0.0",
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
          ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
        os,
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      sandbox.stub(fileUtils, "removeReactTmpDir");
      sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(fs, "lstatSync").returns({ isDirectory: () => false } as any);
      sandbox.stub(g2js, "parseFile").resolves({ "project.ext.react": ["enableHermes: true"] });
      const runHermesEmitBinaryCommandStub = sandbox.stub(ReactNativeTools, "runHermesEmitBinaryCommand");

      // Act
      await command.execute();

      // Assert
      expect(runHermesEmitBinaryCommandStub.calledOnce).is.true;
    });

    it("uses hermesCommand path if set in gradle file", async function () {
      const os = "Android";
      // Arrange
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
          "--target-binary-version", "1.0.0",
          "--deployment-name", deployment,
          "--app", app,
          "--token", "c1o3d3e7",
        ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
        os,
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      sandbox.stub(fileUtils, "removeReactTmpDir");
      sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(fs, "lstatSync").returns({ isDirectory: () => false } as any);
      sandbox.stub(g2js, "parseFile").resolves({
        "project.ext.react": ["enableHermes: true", 'hermesCommand: "../../../hermes/is/here"'],
      });

      const childProcessStub = new events.EventEmitter() as any;
      childProcessStub.stdout = {
        on: () => {},
      };
      childProcessStub.stderr = {
        on: () => {},
      };
      const childProcessSpawnStub = sandbox
        .stub(cp, "spawn")
        .onFirstCall()
        .callsFake(() => {
          setTimeout(() => {
            childProcessStub.emit("close");
          });
          return childProcessStub as any;
        });
      sandbox.stub(fs, "copyFile").yields(null);
      sandbox.stub(fs, "unlink").yields(null);

      // Act
      const result = await command.execute();

      // Assert
      sandbox.assert.calledWith(childProcessSpawnStub, "../hermes/is/here");
      expect(result.succeeded).to.be.true;
    });

    it("project.ext.react is not defined in the app gradle file", async function () {
      const os = "Android";
      // Arrange
      const args = {
        ...goldenPathArgs,
        // prettier-ignore
        args: [
            "--target-binary-version", "1.0.0",
            "--deployment-name", deployment,
            "--app", app,
            "--token", "c1o3d3e7",
          ],
      };
      const command = new CodePushReleaseReactCommand(args);
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
        os,
        platform: "react-native",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      sandbox.stub(fileUtils, "removeReactTmpDir");
      sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
      sandbox.stub(fs, "lstatSync").returns({ isDirectory: () => false } as any);
      sandbox.stub(g2js, "parseFile").resolves({ bogusKey: "bogusValue" });
      const runHermesEmitBinaryCommandStub = sandbox.stub(ReactNativeTools, "runHermesEmitBinaryCommand");

      // Act
      await command.execute();

      // Assert
      expect(runHermesEmitBinaryCommandStub.notCalled).is.true;
    });
    context("RN versions", function () {
      [
        { version: "^0.63.3", desc: "versions starting with caret" },
        { version: "mobiletechvn/react-native#v0.63.2.fix-shadow-node", desc: "custom versions" },
      ].forEach((testCase) => {
        it(`works for ${testCase.desc} like (${testCase.version})`, async function () {
          const os = "Android";
          // Arrange
          const args = {
            ...goldenPathArgs,
            // prettier-ignore
            args: [
                "--target-binary-version", "1.0.0",
                "--deployment-name", deployment,
                "--app", app,
                "--token", "c1o3d3e7",
              ],
          };
          const command = new CodePushReleaseReactCommand(args);
          sandbox.stub(fs, "readFileSync").returns(`
              {
                "name": "RnCodepushAndroid",
                "version": "0.0.1",
                "dependencies": {
                  "react": "16.13.1",
                  "react-native": "^0.63.3",
                  "react-native-code-push": "6.3.0"
                }
              }
            `);

          Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
          Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
            os,
            platform: "react-native",
          });
          sandbox.stub(mkdirp, "sync");
          sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
          sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
          sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
          sandbox.stub(fileUtils, "removeReactTmpDir");
          sandbox.stub(ReactNativeTools, "runReactNativeBundleCommand");
          sandbox.stub(fs, "lstatSync").returns({ isDirectory: () => false } as any);
          sandbox.stub(g2js, "parseFile").resolves({ "project.ext.react": ["enableHermes: true"] });
          const childProcessStub = new events.EventEmitter() as any;
          childProcessStub.stdout = {
            on: () => {},
          };
          childProcessStub.stderr = {
            on: () => {},
          };
          sandbox
            .stub(cp, "spawn")
            .onFirstCall()
            .callsFake(() => {
              setTimeout(() => {
                childProcessStub.emit("close");
              });
              return childProcessStub as any;
            });
          sandbox.stub(fs, "copyFile").yields(null);
          sandbox.stub(fs, "unlink").yields(null);

          // Act
          const result = await command.execute();

          // Assert
          expect(result.succeeded).to.be.true;
        });
      });
    });
  });
});
