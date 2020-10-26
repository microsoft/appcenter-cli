import * as Nock from "nock";
import * as Temp from "temp";
import * as Sinon from "sinon";
import { expect } from "chai";
import CodePushReleaseCommand from "../../../src/commands/codepush/release";
import * as updateContentsTasks from "../../../src/commands/codepush/lib/update-contents-tasks";
import {
  getFakeParamsForRequest,
  createFile,
  getCommandArgsForReleaseCommand,
  FakeParamsForRequests,
  nockPlatformRequest,
  getLastFolderForSignPath,
  releaseUploadResponse,
  setMetadataResponse,
} from "./utils";
import * as fileUtils from "../../../src/commands/codepush/lib/file-utils";
import { CommandArgs, CommandFailedResult } from "../../../src/util/commandline";

describe.only("CodePush release command", () => {
  const tmpFolderPath = Temp.mkdirSync("releaseTest");
  const releaseFileName = "releaseBinaryFile";
  const releaseFileContent = "Hello World!";
  const appDescription = "app description";

  const fakeParamsForRequests: FakeParamsForRequests = getFakeParamsForRequest();

  let nockedApiGatewayRequests: Nock.Scope;
  let nockedFileUploadServiceRequests: Nock.Scope;
  let sandbox: Sinon.SinonSandbox;
  let stubbedSign: Sinon.SinonStub;

  beforeEach(() => {
    nockedApiGatewayRequests = Nock(fakeParamsForRequests.host)
      .get(
        `/${fakeParamsForRequests.appVersion}/apps/${fakeParamsForRequests.userName}/${fakeParamsForRequests.appName}/deployments/Staging`
      )
      .reply(200, (uri: any, requestBody: any) => {
        return {};
      });

    nockedApiGatewayRequests
      .post(
        `/${fakeParamsForRequests.appVersion}/apps/${fakeParamsForRequests.userName}/${fakeParamsForRequests.appName}/deployments/Staging/uploads`
      )
      .reply(200, releaseUploadResponse);

    nockedFileUploadServiceRequests = Nock(releaseUploadResponse.upload_domain)
      .post(`/upload/set_metadata/${releaseUploadResponse.id}`)
      .query(true)
      .reply(200, setMetadataResponse);

    nockedFileUploadServiceRequests
      .post(`/upload/upload_chunk/${releaseUploadResponse.id}`)
      .query({
        token: releaseUploadResponse.token,
        block_number: 1,
      })
      .reply(200, {
        error: false,
        chunk_num: 0,
        error_code: "None",
        state: "Done",
      });

    nockedFileUploadServiceRequests
      .post(`/upload/finished/${releaseUploadResponse.id}`)
      .query({
        token: releaseUploadResponse.token,
      })
      .reply(200, {
        error: false,
        chunk_num: 0,
        error_code: "None",
        state: "Done",
      });

    nockCreateRelease({ mandatory: false, disabled: false });

    sandbox = Sinon.createSandbox();
    stubbedSign = sandbox.stub(updateContentsTasks, "sign");
  });

  afterEach(() => {
    Nock.cleanAll();
    sandbox.restore();
  });

  it("succeed if all parameters are passed", async function () {
    // Arrange
    const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
    const goldenArgs = {
      // prettier-ignore
      args: [
        "--update-contents-path", releaseFilePath,
        "--target-binary-version", fakeParamsForRequests.appVersion,
        "--deployment-name", "Staging",
        "--description", "app description",
        "--disabled",
        "--mandatory",
        "--private-key-path", "fake/private-key-path",
        "--disable-duplicate-release-error",
        "--rollout", "100",
        "--app", `${fakeParamsForRequests.userName}/${fakeParamsForRequests.appName}`,
        "--token", fakeParamsForRequests.token,
      ],
      command: ["codepush", "release"],
      commandPath: "fake/path",
    };

    nockPlatformRequest("Cordova", fakeParamsForRequests, nockedApiGatewayRequests);
    nockCreateRelease({ mandatory: true, disabled: true });

    // Act
    const command = new CodePushReleaseCommand(goldenArgs);
    const result = await command.execute();

    // Assert
    expect(result.succeeded).to.be.true;
  });
  context("--update-contents-path validation", function () {
    it("should fail if --update-contents-path is not binary or zip", async function () {
      // Arrange
      const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
      const args: CommandArgs = getCommandArgsForReleaseCommand(
        // prettier-ignore
        [
          "-c", releaseFilePath,
          "-k", "fakePrivateKey.pem",
          "--description", appDescription,
          "-t", fakeParamsForRequests.appVersion,
        ],
        fakeParamsForRequests
      );

      sandbox.stub(fileUtils, "isBinaryOrZip").returns(true);

      // Act
      const command = new CodePushReleaseCommand(args);
      const result = (await command.execute()) as CommandFailedResult;

      // Assert
      expect(result.succeeded).to.be.false;
      expect(result.errorMessage).to.eql(
        "It is unnecessary to package releases in a .zip or binary file. Please specify the direct path to the update content's directory (e.g. /platforms/ios/www) or file (e.g. main.jsbundle)."
      );
    });
  });
  context("--target-binary-version validation", function () {
    it("should fail if --target-binary-version is not valid", async function () {});
  });
  context("--rollout validation", function () {
    it("should fail if --rollout is not valid", async function () {});
  });
  context("--target-binary-version correction", function () {
    it("should correct value if not fulfilled", async function () {});
  });
  context("edge cases after uploading release", function () {
    describe("when 409 error is returned after uploading the bundle", function () {
      it("should fail if --disable-duplicate-release-error is set to false", async function () {});
      it("should succeed if --disable-duplicate-release-error is set to true", async function () {});
    });
    it("should fail if 503 error is returned", async function () {});
    it("should remove temporary zip bundle at the end", async function () {});
  });
  context("signed release", () => {
    describe("path generation should correctly work", () => {
      [
        { platform: "React-Native", lastFolderForSignPathCheck: true },
        { platform: "Cordova", lastFolderForSignPathCheck: false },
        { platform: "Electron", lastFolderForSignPathCheck: false },
      ].forEach((testCase) => {
        it(`for ${testCase.platform} with private key`, async () => {
          // Arrange
          const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
          nockPlatformRequest(testCase.platform, fakeParamsForRequests, nockedApiGatewayRequests);

          const args: CommandArgs = getCommandArgsForReleaseCommand(
            // prettier-ignore
            [
              "-c", releaseFilePath,
              "-k", "fakePrivateKey.pem",
              "--description", appDescription,
              "-t", fakeParamsForRequests.appVersion,
            ],
            fakeParamsForRequests
          );

          // Act
          const testRelaseSkeleton = new CodePushReleaseCommand(args);
          const result = await testRelaseSkeleton.execute();

          // Assert
          expect(result.succeeded).to.be.true;
          const lastFolderForSignPath = getLastFolderForSignPath(stubbedSign);
          expect(lastFolderForSignPath === "CodePush").to.eql(
            testCase.lastFolderForSignPathCheck,
            `Last folder in path should ${!testCase.lastFolderForSignPathCheck ? "not" : ""} be 'CodePush'`
          );
          nockedApiGatewayRequests.done();
        });
      });
    });
  });

  function nockCreateRelease(options: { mandatory: boolean; disabled: boolean }) {
    nockedApiGatewayRequests
      .post(
        `/${fakeParamsForRequests.appVersion}/apps/${fakeParamsForRequests.userName}/${fakeParamsForRequests.appName}/deployments/Staging/releases`,
        {
          release_upload: releaseUploadResponse,
          target_binary_version: fakeParamsForRequests.appVersion,
          mandatory: options.mandatory,
          disabled: options.disabled,
          description: appDescription,
          rollout: 100,
        }
      )
      .reply(201, {
        target_binary_range: fakeParamsForRequests.appVersion,
        blob_url: "storagePackage.blobUrl",
        description: "storagePackage.description",
        is_disabled: "storagePackage.isDisabled",
        is_mandatory: options.mandatory,
        label: "storagePackage.label",
        original_deployment: "storagePackage.originalDeployment",
        original_label: "storagePackage.originalLabel",
        package_hash: "storagePackage.packageHash",
        released_by: "userEmail",
        release_method: "releaseMethod",
        rollout: 100,
        size: 512,
        upload_time: "uploadTime",
      });
  }
});
