import CodePushDeploymentHistoryCommand from "../../../../src/commands/codepush/deployment/history";
import { formatDate } from "../../../../src/commands/codepush/deployment/lib/date-helper";
import { models } from "../../../../src/util/apis";

const lineFeed = "\n";

export const fakeAppOwner = "test";
export const fakeAppName = "test";
export const fakeAppIdentifier = `${fakeAppOwner}/${fakeAppName}`;
export const fakeNonExistentAppIdentifier = "Non/Existent";
export const fakeDeploymentName = "Staging";
export const fakeNonExistentDeploymentName = "Dev";
export const fakeEmail = "fake@email.com";
export const fakeToken = "c1o3d3e7";
// tslint:disable-next-line:no-http-string
export const fakeHost = "http://localhost:1700";

const fakeCommandArgs = {
  command: ["codepush", "deployment", "history"],
  args: ["-a", "FAKE/FAKE", "FAKE", "--token", fakeToken, "--env", "local"],
  commandPath: "FAKE"
};

export const fakeCommand = new CodePushDeploymentHistoryCommand(fakeCommandArgs);

export const fakeReleases: models.CodePushRelease[] = [
  { label: "v1", releaseMethod: "Upload", description: "First Release!" },
  { label: "v2", releaseMethod: "Promote", originalLabel: "v6", originalDeployment: "TestDep" },
  { label: "v3", releaseMethod: "Rollback", originalLabel: "v1", isDisabled: true },
  { label: "v4", releaseMethod: "Upload", rollout: 0 },
  { label: "v5", releaseMethod: "Upload", rollout: 56 },
  { label: "v6", releaseMethod: "Upload", isDisabled: true },
  { label: "v7", releaseMethod: "Upload" },
  { label: "v8", releaseMethod: "Upload", rollout: 0 },
];

export const fakeMetrics: models.CodePushReleaseMetric[] = [
  { label: "1.0", active: 2, downloaded: 0, failed: 0, installed: 10 },
  { label: "v1", active: 3, downloaded: 10, failed: 2, installed: 5 },
  { label: "v2", active: 2, downloaded: 4, failed: 0, installed: 4 },
  { label: "v5", active: 1, downloaded: 1, failed: 0, installed: 1 },
  { label: "v6", active: 0, downloaded: 1 },
  { label: "v7", active: 0 },
];

export const fakeReleasesTotalActive = fakeMetrics.reduce((sum, releaseMetrics) => sum += releaseMetrics.active, 0);

export const expectedAdditionalInfoStrings = [
  "",
  lineFeed + "(Promoted v6 from TestDep)",
  lineFeed + "(Rolled back v2 to v1)",
  "",
  "",
  "",
  "",
  ""
];

export const expectedMetricsStrings = [
  "Active: 38% (3 of 8)" + lineFeed + "Installed: 5 (3 pending)" + lineFeed + "Rollbacks: 2",
  "Active: 25% (2 of 8)" + lineFeed + "Installed: 4",
  "No installs recorded" + lineFeed + "Disabled: Yes",
  "No installs recorded" + lineFeed + "Rollout: 0%",
  "Active: 13% (1 of 8)" + lineFeed + "Installed: 1" + lineFeed + "Rollout: 56%",
  "Active: 0% (0 of 8)" + lineFeed + "Disabled: Yes",
  "Active: 0% (0 of 8)",
  "No installs recorded" + lineFeed + "Rollout: 0%",
];

export const fakeReleasesResponse = [
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

export const fakeMetricsResponse = [
  { label: "1.0", active: 1, installed: 2, downloaded: 0, failed: 0 },
  { label: "v1", active: 1, installed: 1, downloaded: 2, failed: 0 },
  { label: "v2", active: 0, installed: 1, downloaded: 1, failed: 0 }
];

export const expectedOutTableRows = [
  ["v1", formatDate(fakeReleasesResponse[0].upload_time), "1.0", "No", "", "Active: 50% (1 of 2)\nInstalled: 1 (1 pending)"],
  ["v2", formatDate(fakeReleasesResponse[1].upload_time), "1.0", "Yes", "Description", "Active: 0% (0 of 2)\nInstalled: 1\nRollout: 55%\nDisabled: Yes"],
  ["v3", formatDate(fakeReleasesResponse[2].upload_time) + "\n(Promoted v1 from TestDep)", "1.1", "Yes", "", "No installs recorded\nRollout: 33%"]
];

export const appNotExistMessage = "The app Non/Existent does not exist.";
export const deploymentNotExistRegExp = /^The deployment .+ does not exist.$/;
