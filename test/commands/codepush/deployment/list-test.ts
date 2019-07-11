import { expect } from "chai";
import CodePushDeploymentListListCommand from "../../../../src/commands/codepush/deployment/list";
import { models } from "../../../../src/util/apis";
import { CommandArgs, CommandFailedResult } from "../../../../src/util/commandline";
import * as Sinon from "sinon";
import * as Nock from "nock";
import { formatDate } from "../../../../src/commands/codepush/deployment/lib/date-helper";
import { getFakeParamsForRequest, FakeParamsForRequests } from "../utils";
import chalk from "chalk";
import { out } from "../../../../src/util/interaction/index";

// Have to use `require` because of this: https://github.com/chalk/strip-ansi/issues/11
const stripAnsi = require("strip-ansi");

describe("CodePush deployment list tests", () => {
  const fakeBlobUrl = "fakeURL";
  const fakeIsDisabled = false;
  const fakeIsMandatory = false;
  const fakeLabel = "fakeLabel";
  const fakePackageHash = "fakeHash";
  const fakeReleasedBy = "fakeAuthor";
  const fakeReleaseMethod = "Upload";
  const fakeRollout = 100;
  const fakeSize = 100;
  const fakeTargetBinaryRange = "fakeTarget";
  const fakeUploadTime = 1538747519563;
  const fakeDescription = "fakeDescription";
  const fakeReleasesTotalActive = 3;
  const successfulStatus = 200;
  const unsuccessfulStatus = 404;
  // tslint:disable-next-line:no-http-string
  const fakeHost = "http://localhost:1700";

  const fakeParamsForRequest: FakeParamsForRequests = getFakeParamsForRequest();
  const defaultCommandArgsForListCommand: CommandArgs = getCommandArgsForListCommand(fakeParamsForRequest);

  const fakeMetadataRelease: models.CodePushRelease = {
    blobUrl: fakeBlobUrl,
    isDisabled: fakeIsDisabled,
    isMandatory: fakeIsMandatory,
    label: fakeLabel,
    packageHash: fakePackageHash,
    releasedBy: fakeReleasedBy,
    releaseMethod: fakeReleaseMethod,
    rollout: fakeRollout,
    size: fakeSize,
    targetBinaryRange: fakeTargetBinaryRange,
    uploadTime: fakeUploadTime,
  };
  const fakeReleaseForRequest = {
    target_binary_range: fakeTargetBinaryRange,
    blob_url: fakeBlobUrl,
    description: fakeDescription,
    is_disabled: fakeIsDisabled,
    is_mandatory: fakeIsMandatory,
    label: fakeLabel,
    package_hash: fakePackageHash,
    released_by: fakeReleasedBy,
    release_method: fakeReleaseMethod,
    rollout: fakeRollout,
    size: fakeSize,
    upload_time: fakeUploadTime,
    diff_package_map: {}
  };
  const noUpdatesString = "No updates released";
  const noMetricsString = "No installs recorded";

  const fakeDeployment: models.Deployment = {
    name: "fakeDeploymentName",
    key: "fakeDeploymentKey",
  };
  const fakeDeploymentWithRelease: models.Deployment = Object.assign({ latest_release: fakeReleaseForRequest }, fakeDeployment);
  const expectedGeneratedMetadataString = "Label: " + fakeLabel +
    "\nApp Version: " + fakeTargetBinaryRange +
    "\nMandatory: No" +
    "\nRelease Time: " + formatDate(fakeUploadTime) +
    "\nReleased By: " + fakeReleasedBy;

  const expectedOutputHelperText = "Note: To display deployment keys add -k|--displayKeys option";
  const expectedErrorMessage = `The app ${fakeParamsForRequest.userName}/${fakeParamsForRequest.appName} does not exist.`;

  describe("deployment list unit tests", () => {
    it("generateMetadataString", () => {
      // Arrange
      const command = new CodePushDeploymentListListCommand(defaultCommandArgsForListCommand);
      const generateMetadataString: (release: models.CodePushRelease) => string = command["generateMetadataString"];

      // Act
      const result = generateMetadataString(fakeMetadataRelease);

      // Assert
      expect(result).to.be.an("string");
      expect(removeColorFromText(result)).to.be.eql(expectedGeneratedMetadataString);
    });

    it("generateColoredTableTitles", () => {
      // Arrange
      const command = new CodePushDeploymentListListCommand(defaultCommandArgsForListCommand);
      const generateColoredTableTitles: (tableTitles: string[]) => string[] = command["generateColoredTableTitles"];
      const fakeDeploymentsName = ["fakeDeployment", "fakeDeployment2"];
      const expected = [chalk.cyan("fakeDeployment"), chalk.cyan("fakeDeployment2")];

      // Act
      const result = generateColoredTableTitles(fakeDeploymentsName);

      // Assert
      expect(result).to.be.an("array");
      expect(result).to.be.eql(expected);
    });

    describe("generateMetricsString", () => {
      it("should return correct metrics for any% active releases", () => {
        // Arrange
        const command = new CodePushDeploymentListListCommand(defaultCommandArgsForListCommand);
        const generateMetricsString: (releaseMetrics: models.CodePushReleaseMetric, releasesTotalActive: number) => string = command["generateMetricsString"];
        const fakeReleaseMetrics = {
          active: 1,
          downloaded: 1,
          failed: 0,
          installed: 1,
          label: fakeLabel
        };

        const fakeActiveString: string = "33% (1 of 3)";
        const fakeInstalled: string = "1";
        const expectedMetrics = getExpectedMetricsString(fakeActiveString, fakeInstalled);

        // Act
        const result = generateMetricsString(fakeReleaseMetrics, fakeReleasesTotalActive);

        // Assert
        expect(result).to.be.an("string");
        expect(removeColorFromText(result)).to.be.eql(expectedMetrics);
      });

      it("should return correct metrics for 0% active releases", () => {
        // Arrange
        const command = new CodePushDeploymentListListCommand(defaultCommandArgsForListCommand);
        const generateMetricsString: (releaseMetrics: models.CodePushReleaseMetric, releasesTotalActive: number) => string = command["generateMetricsString"];
        const fakeReleaseMetrics = {
          active: 0,
          downloaded: 1,
          failed: 0,
          installed: 1,
          label: fakeLabel,
        };
        const fakeActiveString: string = "0% (0 of 3)";
        const fakeInstalled: string = "1";
        const expectedMetrics = getExpectedMetricsString(fakeActiveString, fakeInstalled);

        // Act
        const result = generateMetricsString(fakeReleaseMetrics, fakeReleasesTotalActive);

        // Assert
        expect(result).to.be.an("string");
        expect(removeColorFromText(result)).to.be.eql(expectedMetrics);
      });

      it("should return correct metrics for 100% active releases", () => {
        // Arrange
        const command = new CodePushDeploymentListListCommand(defaultCommandArgsForListCommand);
        const generateMetricsString: (releaseMetrics: models.CodePushReleaseMetric, releasesTotalActive: number) => string = command["generateMetricsString"];
        const fakeReleaseMetrics = {
          active: 3,
          downloaded: 3,
          failed: 0,
          installed: 3,
          label: fakeLabel,
        };
        const fakeActiveString: string = "100% (3 of 3)";
        const fakeInstalled: string = "3";
        const expectedMetrics = getExpectedMetricsString(fakeActiveString, fakeInstalled);

        // Act
        const result = generateMetricsString(fakeReleaseMetrics, fakeReleasesTotalActive);

        // Assert
        expect(result).to.be.an("string");
        expect(removeColorFromText(result)).to.be.eql(expectedMetrics);
      });
    });

    it("should return correct metrics with pending releases", () => {
      // Arrange
      const command = new CodePushDeploymentListListCommand(defaultCommandArgsForListCommand);
      const generateMetricsString: (releaseMetrics: models.CodePushReleaseMetric, releasesTotalActive: number) => string = command["generateMetricsString"];
      const fakeReleaseMetrics = {
        active: 3,
        downloaded: 5,
        failed: 0,
        installed: 3,
        label: fakeLabel,
      };
      const fakeActiveString = "100% (3 of 3)";
      const fakeInstalled = "3";
      const fakePending = " (2 pending)";
      const expectedMetrics = getExpectedMetricsString(fakeActiveString, fakeInstalled, fakePending);

      // Act
      const result = generateMetricsString(fakeReleaseMetrics, fakeReleasesTotalActive);

      // Assert
      expect(result).to.be.an("string");
      expect(removeColorFromText(result)).to.be.eql(expectedMetrics);
    });

    it("should return correct string for empty metrics", () => {
      // Arrange
      const command = new CodePushDeploymentListListCommand(defaultCommandArgsForListCommand);
      const generateMetricsString: (releaseMetrics: models.CodePushReleaseMetric, releasesTotalActive: number) => string = command["generateMetricsString"];
      const expectedMetrics = noMetricsString;

      // Act
      const result = generateMetricsString(undefined, fakeReleasesTotalActive);

      // Assert
      expect(result).to.be.an("string");
      expect(removeColorFromText(result)).to.be.eql(expectedMetrics);
    });
  });

  describe("deployment list tests", () => {
    let sandbox: Sinon.SinonSandbox;
    let nockScope: Nock.Scope;

    beforeEach(() => {
      sandbox = Sinon.createSandbox();
      nockScope = Nock(fakeHost);
    });

    afterEach((() => {
      sandbox.restore();
      Nock.cleanAll();
    }));

    it("should output table without releases and metrics", async () => {
      // Arrange
      setupNockGetDeploymentsResponse(nockScope, fakeParamsForRequest, [fakeDeployment]);
      const expectedOutputTable = [[fakeDeployment.name, noUpdatesString, noMetricsString]];

      const spyOutTable = sandbox.stub(out, "table");
      const spyOutText = sandbox.stub(out, "text");

      // Act
      const command = new CodePushDeploymentListListCommand(getCommandArgsForListCommand(fakeParamsForRequest));
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.true;
      expect(spyOutTable.calledOnce).to.be.true;
      expect(spyOutText.calledOnce).to.be.true;

      const resultTable = spyOutTable.lastCall.args[1];
      expect(resultTable).to.be.an("array");
      expect(removeColorFromTableRows(resultTable)).to.be.eql(expectedOutputTable);

      const resultText = spyOutText.getCall(0).args[0];
      expect(resultText).to.be.an("string");
      expect(resultText).to.be.eql(expectedOutputHelperText);
      nockScope.done();
    });

    it("should output table with correct data for releases without metrics", async () => {
      // Arrange
      setupNockGetDeploymentsResponse(nockScope, fakeParamsForRequest, [fakeDeploymentWithRelease]);
      setupNockGetDeploymentMetricsResponse(nockScope, fakeParamsForRequest, {}, fakeDeployment);

      const expectedOutputTable = [[fakeDeployment.name, expectedGeneratedMetadataString, noMetricsString]];

      const spyOutTable = sandbox.stub(out, "table");
      const spyOutText = sandbox.stub(out, "text");

      // Act
      const command = new CodePushDeploymentListListCommand(getCommandArgsForListCommand(fakeParamsForRequest));
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.true;
      expect(spyOutTable.calledOnce).to.be.true;
      expect(spyOutText.calledOnce).to.be.true;

      const resultTable = spyOutTable.lastCall.args[1];
      expect(resultTable).to.be.an("array");
      expect(removeColorFromTableRows(resultTable)).to.be.eql(expectedOutputTable);

      const resultText = spyOutText.getCall(0).args[0];
      expect(resultText).to.be.an("string");
      expect(resultText).to.be.eql(expectedOutputHelperText);
      nockScope.done();
    });

    it("should output table with correct data for releases with metrics", async () => {
      // Arrange
      const fakeReleaseMetrics = {
        active: 3,
        downloaded: 5,
        failed: 0,
        installed: 3,
        label: fakeLabel,
      };
      setupNockGetDeploymentsResponse(nockScope, fakeParamsForRequest, [fakeDeploymentWithRelease, fakeDeploymentWithRelease]);
      setupNockGetDeploymentMetricsResponse(nockScope, fakeParamsForRequest, [fakeReleaseMetrics], fakeDeployment, successfulStatus, 2);

      const fakeActiveString = "100% (3 of 3)";
      const fakeInstalled = "3";
      const fakePending = " (2 pending)";
      const expectedLine = [fakeDeployment.name, expectedGeneratedMetadataString, getExpectedMetricsString(fakeActiveString, fakeInstalled, fakePending)];
      const expectedOutputTable = [expectedLine, expectedLine];

      const spyOutTable = sandbox.stub(out, "table");
      const spyOutText = sandbox.stub(out, "text");

      // Act
      const command = new CodePushDeploymentListListCommand(getCommandArgsForListCommand(fakeParamsForRequest));
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.true;
      expect(spyOutTable.calledOnce).to.be.true;
      expect(spyOutText.calledOnce).to.be.true;

      const resultTable = spyOutTable.lastCall.args[1];
      expect(removeColorFromTableRows(resultTable)).to.be.eql(expectedOutputTable);

      const resultText = spyOutText.getCall(0).args[0];
      expect(resultText).to.be.an("string");
      expect(resultText).to.be.eql(expectedOutputHelperText);
      nockScope.done();
    });

    it("should output table with deployment keys", async () => {
      // Arrange
      setupNockGetDeploymentsResponse(nockScope, fakeParamsForRequest, [fakeDeployment]);
      const expectedOutputTable = [fakeDeployment.name, fakeDeployment.key];
      const spyOutTable = sandbox.stub(out, "table");

      // Act
      const command = new CodePushDeploymentListListCommand(getCommandArgsForListCommand(fakeParamsForRequest, ["-k"]));
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.true;
      expect(spyOutTable.calledOnce).to.be.true;

      const resultTable = spyOutTable.lastCall.args[1];
      expect(resultTable[0]).to.be.an("array");
      expect(resultTable[0]).to.be.eql(expectedOutputTable);
      nockScope.done();
    });

    it("should output error when app does not exist", async () => {
      // Arrange
      setupNockGetDeploymentsResponse(nockScope, fakeParamsForRequest, {}, unsuccessfulStatus);

      // Act
      const command = new CodePushDeploymentListListCommand(getCommandArgsForListCommand(fakeParamsForRequest));
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.false;
      expect((result as CommandFailedResult).errorMessage).contain(expectedErrorMessage);
      nockScope.done();
    });
  });

  function getExpectedMetricsString(fakeActiveString: string, fakeInstalled: string, pendingString?: string): string {
    let metricsString =  "Active: " + fakeActiveString + "\nInstalled: " + fakeInstalled;
    if (pendingString) {
      metricsString += pendingString;
    }

    return metricsString;
  }

  function setupNockGetDeploymentsResponse(
      nockScope: Nock.Scope,
      fakeParamsForRequest: FakeParamsForRequests,
      returnDeployments: models.Deployment[] | {},
      statusCode: number = 200
    ): void {
    nockScope.get(`/${fakeParamsForRequest.appVersion}/apps/${fakeParamsForRequest.userName}/${fakeParamsForRequest.appName}/deployments`)
      .reply((uri: any, requestBody: any)  => {
        return [statusCode, returnDeployments];
      }
    );
  }

  function setupNockGetDeploymentMetricsResponse(
      nockScope: Nock.Scope,
      fakeParamsForRequest: FakeParamsForRequests,
      returnMetrics: models.CodePushReleaseMetric[] | {},
      fakeDeployment: models.Deployment,
      statusCode: number = 200,
      times: number = 1
    ): void {
    nockScope.get(`/${fakeParamsForRequest.appVersion}/apps/${fakeParamsForRequest.userName}/${fakeParamsForRequest.appName}/deployments/${fakeDeployment.name}/metrics`).times(times)
      .reply((uri: any, requestBody: any): any  => {
        return [statusCode, returnMetrics];
      }
    );
  }

  function removeColorFromText(text: string): string  {
    return stripAnsi(text);
  }

  function removeColorFromTableRows(tableRows: string[][]) {
    return tableRows.map((row) => row.map((element) => stripAnsi(element)));
  }

  function getCommandArgsForListCommand(fakeConsts: FakeParamsForRequests, additionalArgs: string[] = []): CommandArgs {
    const args: string[] = ["-a", `${fakeConsts.userName}/${fakeConsts.appName}`, "--token", fakeConsts.token, "--env", "local"].concat(additionalArgs);
    return {
      args,
      command: ["codepush", "deployment", "list"],
      commandPath: fakeConsts.path,
    };
  }
});
