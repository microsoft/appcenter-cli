import * as fs from "fs";
import * as path from "path";
import { expect } from "chai";
import * as Sinon from "sinon";
import * as Nock from "nock";
import * as pfs from "../../../src/util/misc/promisfied-fs";
import CodePushReleaseElectronCommand from "../../../src/commands/codepush/release-electron";
import { CommandArgs } from "../../../src/util/commandline/command";
import * as mkdirp from "mkdirp";
import * as ElectronTools from "../../../src/commands/codepush/lib/electron-utils";
import * as fileUtils from "../../../src/commands/codepush/lib/file-utils";
import { CommandFailedResult, CommandResult } from "../../../src/util/commandline";
import * as updateContentsTasks from "../../../src/commands/codepush/lib/update-contents-tasks";

describe("codepush release-electron command", function () {
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
      "--extra-bundler-option", "bogusElectronBundle",
      "--target-binary-version", "1.0.0",
      "--output-dir", "fake/out/dir",
      "--sourcemap-output-dir", "fake/sourcemap/output",
      "--sourcemap-output", "sourceMapOutput.txt",
      "--entry-file", "entry.js",
      "--config", "webpack.config.js",
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
    command: ["codepush", "release-electron"],
    commandPath: "fake/path",
  };
  it("succeed if all parameters are passed", async function () {
    // Arrange
    const command = new CodePushReleaseElectronCommand(goldenPathArgs);
    sandbox.stub(fs, "readFileSync").returns(`
    {
      "name": "electron-bogus-app",
      "version": "0.0.1",
      "dependencies": {
        "electron": "16.13.1"
      }
    }
    `);

    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
      os: "Windows",
      platform: "electron",
    });
    sandbox.stub(mkdirp, "sync");
    sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
    sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
    sandbox.stub(ElectronTools, "runWebPackBundleCommand");
    sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

    // Act
    const result = await command.execute();

    // Assert
    expect(result.succeeded).to.be.true;
  });

  it("npm package should have name defined check", async function () {
    // Arrange
    const command = new CodePushReleaseElectronCommand(goldenPathArgs);
    sandbox.stub(fs, "readFileSync").returns(`
        {
          "version": "0.0.1",
          "dependencies": {
            "electron": "10.1.5"
          }
        }
      `);

    // Act
    const result = command.execute();

    // Assert
    return expect(result).to.eventually.be.rejectedWith('The "package.json" file in the CWD does not have the "name" field set.');
  });

  context("electron dependency", function () {
    it("throws error if no electron in dependencies and devDependencies", async function () {
      // Arrange
      const command = new CodePushReleaseElectronCommand(goldenPathArgs);
      sandbox.stub(fs, "readFileSync").returns(`
        {
          "name": "electron-bogus-app",
          "version": "0.0.1",
          "dependencies": {
            "some-package": "6.3.0"
          }
        }
      `);

      // Act
      const result = (await command.execute()) as CommandFailedResult;

      // Assert
      expect(result.succeeded).to.be.false;
      expect(result.errorMessage).to.equal("The project in the CWD is not a Electron project.");
    });

    it("finishes to end if electron specified in dependencies ", async function () {
      // Arrange
      const command = new CodePushReleaseElectronCommand(goldenPathArgs);
      sandbox.stub(fs, "readFileSync").returns(`
        {
          "name": "electron-bogus-app",
          "version": "0.0.1",
          "dependencies": {
            "electron": "10.1.5"
          }
        }
      `);

      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os: "Windows",
        platform: "electron",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(ElectronTools, "runWebPackBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

      // Act
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.true;
    });

    it("finishes to end if electron specified in devDependencies ", async function () {
      // Arrange
      const command = new CodePushReleaseElectronCommand(goldenPathArgs);
      sandbox.stub(fs, "readFileSync").returns(`
        {
          "name": "electron-bogus-app",
          "version": "0.0.1",
          "dependencies": {
            "some-package": "6.3.0"
          },
          "devDependencies": {
            "electron": "10.1.5"
          }
        }
      `);

      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os: "MacOS",
        platform: "electron",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(ElectronTools, "runWebPackBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

      // Act
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.true;
    });
  });
  it("shows user friendly error when incorrect deployment specified", async function () {
    // Arrange
    const command = new CodePushReleaseElectronCommand(goldenPathArgs);
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(404, {});
    sandbox.stub(fs, "readFileSync").returns(`
      {
        "name": "electron-bogus-app",
        "version": "0.0.1",
        "dependencies": {
          "electron": "10.1.5"
        }
      }
    `);

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
      const command = new CodePushReleaseElectronCommand(args);
      sandbox.stub(fs, "readFileSync").returns(`
          {
            "name": "electron-bogus-app",
            "version": "0.0.1",
            "dependencies": {
              "electron": "10.1.5"
            }
          }
        `);

      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os: "Windows",
        platform: "electron",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(ElectronTools, "runWebPackBundleCommand");
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
      const command = new CodePushReleaseElectronCommand(args);
      sandbox.stub(fs, "readFileSync").returns(`
          {
            "name": "electron-bogus-app",
            "version": "0.0.1",
            "dependencies": {
              "electron": "10.1.5"
            }
          }
        `);

      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os: "Windows",
        platform: "electron",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(ElectronTools, "runWebPackBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      sandbox.stub(pfs, "mkTempDir").resolves(fakePath);
      const rmDirSpy = sandbox.spy(pfs, "rmDir");

      // Act
      await command.execute();

      // Assert
      sandbox.assert.calledOnceWithExactly(rmDirSpy, path.join(fakePath, "CodePush"));
    });
  });

  ["Linux", "MacOS", "Windows"].forEach((os: string) => {
    it(`only Linux, MacOS and Windows OSes are allowed (check the API response) - check ${os}`, async function () {
      // Arrange
      const command = new CodePushReleaseElectronCommand(goldenPathArgs);
      sandbox.stub(fs, "readFileSync").returns(`
          {
            "name": "electron-bogus-app",
            "version": "0.0.1",
            "dependencies": {
              "electron": "10.1.5"
            }
          }
        `);

      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os,
        platform: "electron",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      sandbox.stub(ElectronTools, "runWebPackBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });

      // Act
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.true;
    });
  });

  it("throws an error if non electron platform specified", async function () {
    // Arrange
    const command = new CodePushReleaseElectronCommand(goldenPathArgs);
    sandbox.stub(fs, "readFileSync").returns(`
    {
      "name": "electron-bogus-app",
      "version": "0.0.1",
      "dependencies": {
        "electron": "10.1.5"
      }
    }
    `);

    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
      os: "MacOS",
      platform: "objective-c",
    });

    // Act
    const result = await command.execute();

    // Assert
    expect(result.succeeded).to.be.false;
  });

  it("bundle name defaults", async function () {
    const os = "Windows";
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
    const command = new CodePushReleaseElectronCommand(args);
    sandbox.stub(fs, "readFileSync").returns(`
          {
            "name": "electron-bogus-app",
            "version": "0.0.1",
            "dependencies": {
              "electron": "10.1.5"
            }
          }
        `);

    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
      os,
      platform: "electron",
    });
    sandbox.stub(mkdirp, "sync");
    sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
    sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
    const rnBundleStub = sandbox.stub(ElectronTools, "runWebPackBundleCommand");
    sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
    sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

    // Act
    await command.execute();

    // Assert
    expect(rnBundleStub.getCalls()[0].args[0]).to.be.equal(`index.electron.bundle`);
  });

  context("entry file", function () {
    context("if not specified", function () {
      it("then defaults to webpack.config.js", async function () {
        const os = "Windows";
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
        const command = new CodePushReleaseElectronCommand(args);
        sandbox.stub(fs, "readFileSync").returns(`
          {
            "name": "electron-bogus-app",
            "version": "0.0.1",
            "dependencies": {
              "electron": "10.1.5"
            }
          }
        `);

        Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
        Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
          os,
          platform: "electron",
        });
        sandbox.stub(mkdirp, "sync");
        sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
        sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
        const rnBundleStub = sandbox.stub(ElectronTools, "runWebPackBundleCommand");
        sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
        sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

        // Act
        await command.execute();

        // Assert
        expect(rnBundleStub.getCalls()[0].args[3]).to.be.equal(`index.windows.js`);
      });
      it("and fallback to index.js", async function () {
        const os = "Windows";
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
        const command = new CodePushReleaseElectronCommand(args);
        sandbox.stub(fs, "readFileSync").returns(`
          {
            "name": "electron-bogus-app",
            "version": "0.0.1",
            "dependencies": {
              "electron": "10.1.5"
            }
          }
        `);

        Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
        Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
          os,
          platform: "electron",
        });
        sandbox.stub(mkdirp, "sync");
        const firstAttemptEntryFileName = `index.${os.toLowerCase()}.js`;
        sandbox.replace(fileUtils, "fileDoesNotExistOrIsDirectory", (path) => path === firstAttemptEntryFileName);
        sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
        const rnBundleStub = sandbox.stub(ElectronTools, "runWebPackBundleCommand");
        sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
        sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

        // Act
        await command.execute();

        // Assert
        expect(rnBundleStub.getCalls()[0].args[3]).to.be.equal("index.js");
      });
      it("fails command if no file found", async function () {
        const os = "Windows";
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
        const command = new CodePushReleaseElectronCommand(args);
        sandbox.stub(fs, "readFileSync").returns(`
          {
            "name": "electron-bogus-app",
            "version": "0.0.1",
            "dependencies": {
              "electron": "10.1.5"
            }
          }
        `);

        Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
        Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
          os,
          platform: "electron",
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
      const command = new CodePushReleaseElectronCommand(args);
      sandbox.stub(fs, "readFileSync").returns(`
          {
            "name": "electron-bogus-app",
            "version": "0.0.1",
            "dependencies": {
              "electron": "10.1.5"
            }
          }
        `);

      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os: "Windows",
        platform: "electron",
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
    const os = "Windows";
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
    const command = new CodePushReleaseElectronCommand(args);
    sandbox.stub(fs, "readFileSync").returns(`
      {
        "name": "electron-bogus-app",
        "version": "0.0.1",
        "dependencies": {
          "electron": "10.1.5"
        }
      }
    `);

    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
    Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
      os,
      platform: "electron",
    });
    sandbox.stub(mkdirp, "sync");
    sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
    sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
    const rnBundleStub = sandbox.stub(ElectronTools, "runWebPackBundleCommand");
    sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
    sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

    // Act
    await command.execute();

    // Assert
    expect(rnBundleStub.getCalls()[0].args[5]).to.be.equal(path.join(sourcemapOutputDir, `${bundleName}.map`));
  });
  context("targetBinaryVersion", function () {
    it("fails if targetBinaryVersion is not in valid range", async function () {
      const os = "Windows";
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
      const command = new CodePushReleaseElectronCommand(args);
      sandbox.stub(fs, "readFileSync").returns(`
        {
          "name": "electron-bogus-app",
          "version": "0.0.1",
          "dependencies": {
            "electron": "10.1.5"
          }
        }
      `);

      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os,
        platform: "electron",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");

      // Act
      const result = (await command.execute()) as CommandFailedResult;

      // Assert
      expect(result.errorMessage).to.be.equal("Invalid binary version(s) for a release.");
      expect(result.succeeded).to.be.false;
    });
    it("sets targetBinaryVersion from project settings if not specified", async function () {
      const os = "Windows";
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
      const command = new CodePushReleaseElectronCommand(args);
      sandbox.stub(fs, "readFileSync").returns(`
        {
          "name": "electron-bogus-app",
          "version": "0.0.1",
          "dependencies": {
            "electron": "10.1.5"
          }
        }
      `);

      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}/deployments/${deployment}`).reply(200, {});
      Nock("https://api.appcenter.ms/").get(`/v0.1/apps/${app}`).reply(200, {
        os,
        platform: "electron",
      });
      sandbox.stub(mkdirp, "sync");
      sandbox.stub(fileUtils, "fileDoesNotExistOrIsDirectory").returns(false);
      sandbox.stub(fileUtils, "createEmptyTmpReleaseFolder");
      const fallback = sandbox.stub(ElectronTools, "getElectronProjectAppVersion");
      sandbox.stub(ElectronTools, "runWebPackBundleCommand");
      sandbox.stub(command, "release" as any).resolves(<CommandResult>{ succeeded: true });
      sandbox.stub(pfs, "mkTempDir").resolves("fake/path/code-push");

      // Act
      await command.execute();

      // Assert
      Sinon.assert.called(fallback);
    });
  });
});
