import { expect } from "chai";
import * as chalk from "chalk";
import * as Nock from "nock";
import * as Sinon from "sinon";
import CodePushDeploymentHistoryCommand from "../../../../src/commands/codepush/deployment/history";
import { models } from "../../../../src/util/apis";
import { CommandArgs, CommandFailedResult } from "../../../../src/util/commandline";
import { out } from "../../../../src/util/interaction";
import { formatDate } from "../../../../src/commands/codepush/deployment/lib/date-helper";

describe("CodePush deployment history", () => {

  const lineFeed = "\n";

  const fakeAppOwner = "test";
  const fakeAppName = "test";
  const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
  const fakeNonExistentAppIdentifier = "Non/Existent";
  const fakeDeploymentName = "Staging";
  const fakeNonExistentDeploymentName = "Dev";
  const fakeEmail = "fake@email.com";
  const fakeToken = "c1o3d3e7";
  // tslint:disable-next-line:no-http-string
  const fakeHost = "http://localhost:1700";

  const fakeCommand = new CodePushDeploymentHistoryCommand(getDeploymentHistoryCommandArgs("FAKE/FAKE", "FAKE"));

  const fakeReleases: models.CodePushRelease[] = [
    { label: "v1", releaseMethod: "Upload", description: "First Release!" },
    { label: "v2", releaseMethod: "Promote", originalLabel: "v6", originalDeployment: "TestDep" },
    { label: "v3", releaseMethod: "Rollback", originalLabel: "v1", isDisabled: true },
    { label: "v4", releaseMethod: "Upload", rollout: 0 },
    { label: "v5", releaseMethod: "Upload", rollout: 56 },
    { label: "v6", releaseMethod: "Upload", isDisabled: true },
    { label: "v7", releaseMethod: "Upload" },
    { label: "v8", releaseMethod: "Upload", rollout: 0 },
  ];

  const fakeMetrics: models.CodePushReleaseMetric[] = [
    { label: "1.0", active: 2, downloaded: 0, failed: 0, installed: 10 },
    { label: "v1", active: 3, downloaded: 10, failed: 2, installed: 5 },
    { label: "v2", active: 2, downloaded: 4, failed: 0, installed: 4 },
    { label: "v5", active: 1, downloaded: 1, failed: 0, installed: 1 },
    { label: "v6", active: 0, downloaded: 1 },
    { label: "v7", active: 0 },
  ];

  const fakeReleasesTotalActive = fakeMetrics.reduce((sum, releaseMetrics) => sum += releaseMetrics.active, 0);

  const expectedAdditionalInfoStrings = [
    "",
    lineFeed + "(Promoted v6 from TestDep)",
    lineFeed + "(Rolled back v2 to v1)",
    "",
    "",
    "",
    "",
    ""
  ];

  const expectedMetricsStrings = [
    "Active: 38% (3 of 8)" + lineFeed + "Installed: 5 (3 pending)" + lineFeed + "Rollbacks: 2",
    "Active: 25% (2 of 8)" + lineFeed + "Installed: 4",
    "No installs recorded" + lineFeed + "Disabled: Yes",
    "No installs recorded" + lineFeed + "Rollout: 0%",
    "Active: 13% (1 of 8)" + lineFeed + "Installed: 1" + lineFeed + "Rollout: 56%",
    "Active: 0% (0 of 8)" + lineFeed + "Disabled: Yes",
    "Active: 0% (0 of 8)",
    "No installs recorded" + lineFeed + "Rollout: 0%",
  ];

  const fakeReleasesResponse = [
    {
      target_binary_range: "1.0",
      blob_url: "",
      description: "",
      is_disabled: false,
      is_mandatory: false,
      label: "v1",
      package_hash: "123",
      released_by: fakeEmail,
      release_method: "Upload",
      rollout: 100,
      size: 5000,
      upload_time: 1538122280000,
      diff_package_map: {}
    },
    {
      target_binary_range: "1.0",
      blob_url: "",
      description: "Description",
      is_disabled: true,
      is_mandatory: true,
      label: "v2",
      package_hash: "456",
      released_by: fakeEmail,
      release_method: "Upload",
      rollout: 55,
      size: 10000,
      upload_time: 1538122288888,
      diff_package_map: {}
    },
    {
      target_binary_range: "1.1",
      blob_url: "",
      description: "",
      is_disabled: false,
      is_mandatory: true,
      label: "v3",
      package_hash: "789",
      released_by: fakeEmail,
      release_method: "Promote",
      original_label: "v1",
      original_deployment: "TestDep",
      rollout: 33,
      size: 15000,
      upload_time: 1538122289999,
      diff_package_map: {}
    },
  ];

  const fakeMetricsResponse = [
    { label: "1.0", active: 1, installed: 2, downloaded: 0, failed: 0 },
    { label: "v1", active: 1, installed: 1, downloaded: 2, failed: 0 },
    { label: "v2", active: 0, installed: 1, downloaded: 1, failed: 0 }
  ];

  const expectedOutTableRows = [
    ["v1", formatDate(fakeReleasesResponse[0].upload_time), "1.0", "No", "", "Active: 50% (1 of 2)\nInstalled: 1 (1 pending)"],
    ["v2", formatDate(fakeReleasesResponse[1].upload_time), "1.0", "Yes", "Description", "Active: 0% (0 of 2)\nInstalled: 1\nRollout: 55%\nDisabled: Yes"],
    ["v3", formatDate(fakeReleasesResponse[2].upload_time) + "\n(Promoted v1 from TestDep)", "1.1", "Yes", "", "No installs recorded\nRollout: 33%"]
  ];

  describe("deployment history unit tests", () => {
    it("generateReleaseAdditionalInfoString", () => {
      // Arrange
      const generateReleaseAdditionalInfoString: (release: models.CodePushRelease) => string = fakeCommand["generateReleaseAdditionalInfoString"];

      fakeReleases.forEach((fakeRelease, index) => {
        // Act
        const releaseAdditionalInfoString = generateReleaseAdditionalInfoString(fakeRelease);

        //Assert
        expect(chalk.stripColor(releaseAdditionalInfoString)).to.be.equal(expectedAdditionalInfoStrings[index]);
      });
    });

    it("generateReleaseMetricsString", () => {
      // Arrange
      const generateReleaseMetricsString: (
        release: models.CodePushRelease,
        metrics: models.CodePushReleaseMetric[],
        releasesTotalActive: number
      ) => string = fakeCommand["generateReleaseMetricsString"];

      fakeReleases.forEach((fakeRelease, index) => {
        // Act
        const releaseMetricsString = generateReleaseMetricsString(fakeRelease, fakeMetrics, fakeReleasesTotalActive);

        // Assert
        expect(chalk.stripColor(releaseMetricsString)).to.be.equal(expectedMetricsStrings[index]);
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

      Nock(fakeHost)
        .get(`/v0.1/apps/${fakeAppIdentifier}/deployments/${fakeDeploymentName}/releases`)
        .reply(200, () => { requestReleasesSpy(); return fakeReleasesResponse; })
        .get(`/v0.1/apps/${fakeAppIdentifier}/deployments/${fakeDeploymentName}/metrics`)
        .reply(200, () => { requestMetricsSpy(); return fakeMetricsResponse; })
        .get(`/v0.1/apps/${fakeAppIdentifier}/deployments/${fakeNonExistentDeploymentName}/releases`)
        .reply(400, () => { requestReleasesSpy(); return {}; })
        .get(`/v0.1/apps/${fakeNonExistentAppIdentifier}/deployments/${fakeDeploymentName}/releases`)
        .reply(404, () => { requestReleasesSpy(); return {}; });
    });

    it("should output table with correct data", async () => {
      // Arrange
      const stubbedOutTable = Sinon.stub(out, "table");
      const command = new CodePushDeploymentHistoryCommand(getDeploymentHistoryCommandArgs(fakeAppIdentifier, fakeDeploymentName));

      // Act
      const result = await command.execute();

      const tableRows: string[][] = stubbedOutTable.lastCall.args[1];
      const unchalkedRows = tableRows.map((row) => row.map((element) => chalk.stripColor(element)));

      // Assert
      expect(result.succeeded).to.be.true;
      expect(requestReleasesSpy.calledOnce).to.be.true;
      expect(requestMetricsSpy.calledOnce).to.be.true;
      expect(stubbedOutTable.calledOnce).to.be.true;
      expect(unchalkedRows).to.eql(expectedOutTableRows);

      // Restore
      stubbedOutTable.restore();
    });

    it("should output an error when app does not exist", async () => {
      // Arrange
      const command = new CodePushDeploymentHistoryCommand(getDeploymentHistoryCommandArgs(fakeNonExistentAppIdentifier, fakeDeploymentName));

      // Act
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.false;
      expect(requestReleasesSpy.calledOnce).to.be.true;
      expect(requestMetricsSpy.calledOnce).to.be.false;
      expect((result as CommandFailedResult).errorMessage).contain("The app Non/Existent does not exist.");
    });

    it("should output an error when deployment does not exist", async () => {
      // Arrange
      const command = new CodePushDeploymentHistoryCommand(getDeploymentHistoryCommandArgs(fakeAppIdentifier, fakeNonExistentDeploymentName));

      // Act
      const result = await command.execute();

      // Assert
      expect(result.succeeded).to.be.false;
      expect(requestReleasesSpy.calledOnce).to.be.true;
      expect(requestMetricsSpy.calledOnce).to.be.false;
      expect((result as CommandFailedResult).errorMessage).matches(/^The deployment .+ does not exist.$/);
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
      args: ["-a", appIdentifier, deploymentName, "--token", fakeToken, "--env", "local"],
      commandPath: "FAKE"
    };
  }
});
