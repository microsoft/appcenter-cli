import { expect } from "chai";
import * as Nock from "nock";
import * as Sinon from "sinon";
import CodePushDeploymentHistoryCommand from "../../../../src/commands/codepush/deployment/history";
import { models } from "../../../../src/util/apis";
import { CommandArgs, CommandFailedResult } from "../../../../src/util/commandline";
import { out } from "../../../../src/util/interaction";

import * as testData from "./history-test-data";

// Have to use `require` because of this: https://github.com/chalk/strip-ansi/issues/11
const stripAnsi = require("strip-ansi");

describe("CodePush deployment history", () => {

  describe("deployment history unit tests", () => {
    it("generateReleaseAdditionalInfoString", () => {
      // Arrange
      const generateReleaseAdditionalInfoString: (release: models.CodePushRelease) => string = testData.fakeCommand["generateReleaseAdditionalInfoString"];

      testData.fakeReleases.forEach((fakeRelease, index) => {
        // Act
        const releaseAdditionalInfoString = generateReleaseAdditionalInfoString(fakeRelease);

        //Assert
        expect(stripAnsi(releaseAdditionalInfoString)).to.be.equal(testData.expectedAdditionalInfoStrings[index]);
      });
    });

    it("generateReleaseMetricsString", () => {
      // Arrange
      const generateReleaseMetricsString: (
        release: models.CodePushRelease,
        metrics: models.CodePushReleaseMetric[],
        releasesTotalActive: number
      ) => string = testData.fakeCommand["generateReleaseMetricsString"];

      testData.fakeReleases.forEach((fakeRelease, index) => {
        // Act
        const releaseMetricsString = generateReleaseMetricsString(fakeRelease, testData.fakeMetrics, testData.fakeReleasesTotalActive);

        // Assert
        expect(stripAnsi(releaseMetricsString)).to.be.equal(testData.expectedMetricsStrings[index]);
      });
    });
  });

  describe("deployment history command", () => {

    let requestReleasesSpy: Sinon.SinonSpy;
    let requestMetricsSpy: Sinon.SinonSpy;

    before(() => {
      Nock.disableNetConnect();
    });

    beforeEach(() => {
      requestReleasesSpy = Sinon.spy();
      requestMetricsSpy = Sinon.spy();

      Nock(testData.fakeHost)
        .get(`/v0.1/apps/${testData.fakeAppIdentifier}/deployments/${testData.fakeDeploymentName}/releases`)
        .reply((uri, requestBody) => { requestReleasesSpy(); return [200, testData.fakeReleasesResponse]; } )
        .get(`/v0.1/apps/${testData.fakeAppIdentifier}/deployments/${testData.fakeDeploymentName}/metrics`)
        .reply((uri, requestBody) => { requestMetricsSpy(); return [200, testData.fakeMetricsResponse]; })
        .get(`/v0.1/apps/${testData.fakeAppIdentifier}/deployments/${testData.fakeNonExistentDeploymentName}/releases`)
        .reply((uri, requestBody) => { requestReleasesSpy(); return [400, {}]; })
        .get(`/v0.1/apps/${testData.fakeNonExistentAppIdentifier}/deployments/${testData.fakeDeploymentName}/releases`)
        .reply((uri, requestBody) => { requestReleasesSpy(); return [404, {}]; });
    });

    it("should output table with correct data", async () => {
      // Arrange
      const stubbedOutTable = Sinon.stub(out, "table");
      const command = new CodePushDeploymentHistoryCommand(getDeploymentHistoryCommandArgs(testData.fakeAppIdentifier, testData.fakeDeploymentName));

      // Act
      const result = await command.execute();

      const tableRows: string[][] = stubbedOutTable.lastCall.args[1];
      expect(tableRows).to.be.an("array");
      const unchalkedRows: string[][] = tableRows.map((row) => row.map((element) => stripAnsi(element)));

      // Assert
      expect(result.succeeded).to.be.true;
      expect(requestReleasesSpy.calledOnce).to.be.true;
      expect(requestMetricsSpy.calledOnce).to.be.true;
      expect(stubbedOutTable.calledOnce).to.be.true;
      expect(unchalkedRows).to.eql(testData.expectedOutTableRows);

      // Restore
      stubbedOutTable.restore();
    });

    it("should output an error when app does not exist", async () => {
      // Arrange
      const command = new CodePushDeploymentHistoryCommand(getDeploymentHistoryCommandArgs(testData.fakeNonExistentAppIdentifier, testData.fakeDeploymentName));

      // Act
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.false;
      expect(requestReleasesSpy.calledOnce).to.be.true;
      expect(requestMetricsSpy.calledOnce).to.be.false;
      expect((result as CommandFailedResult).errorMessage).contain(testData.appNotExistMessage);
    });

    it("should output an error when deployment does not exist", async () => {
      // Arrange
      const command = new CodePushDeploymentHistoryCommand(getDeploymentHistoryCommandArgs(testData.fakeAppIdentifier, testData.fakeNonExistentDeploymentName));

      // Act
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.false;
      expect(requestReleasesSpy.calledOnce).to.be.true;
      expect(requestMetricsSpy.calledOnce).to.be.false;
      expect((result as CommandFailedResult).errorMessage).matches(testData.deploymentNotExistRegExp);
    });

    afterEach(() => {
      Nock.cleanAll();
    });

    after(() => {
      Nock.enableNetConnect();
    });
  });

  function getDeploymentHistoryCommandArgs(appIdentifier: string, deploymentName: string): CommandArgs {
    return {
      command: ["codepush", "deployment", "history"],
      args: ["-a", appIdentifier, deploymentName, "--token", testData.fakeToken, "--env", "local"],
      commandPath: "FAKE"
    };
  }
});
