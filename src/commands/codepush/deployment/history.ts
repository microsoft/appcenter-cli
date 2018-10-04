import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, position, name } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { formatDate } from "./lib/date-helper";
import { scriptName } from "../../../util/misc";
import * as chalk from "chalk";

const debug = require("debug")("appcenter-cli:commands:codepush:deployments:history");

@help("Display the release history for a CodePush deployment")
export default class CodePushDeploymentHistoryCommand extends AppCommand {

  @help("Specifies CodePush deployment name to view history")
  @required
  @name("deployment-name")
  @position(0)
  public deploymentName: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;
    let releases: models.CodePushRelease[];
    let metrics: models.CodePushReleaseMetric[];
    try {
      const releasesHttpRequest = await out.progress("Getting CodePush releases...", clientRequest<models.CodePushRelease[]>(
        (cb) => client.codePushDeploymentReleases.get(this.deploymentName, app.ownerName, app.appName, cb)));
      releases = releasesHttpRequest.result;

      const metricsHttpRequest = await out.progress("Getting CodePush releases metrics...", clientRequest<models.CodePushReleaseMetric[]>(
        (cb) => client.codePushDeploymentMetrics.get(this.deploymentName, app.ownerName, app.appName, cb)));
      metrics = metricsHttpRequest.result;

      let releasesTotalActive: number = 0;
      metrics.forEach((metric) => releasesTotalActive += metric.active);

      let tableTitles: string[] = ["Label", "Release Time", "Released by", "App Version", "Mandatory", "Description", "Install Metrics"];
      tableTitles = tableTitles.map((title) => chalk.cyan(title));

      out.table(
        out.getCommandOutputTableOptions(tableTitles),
        releases.map((release) => {
          return [
            release.label,
            formatDate(release.uploadTime),
            release.releasedBy,
            release.targetBinaryRange,
            (release.isMandatory) ? "Yes" : "No",
            release.description,
            this.generateReleaseMetricsString(release, metrics, releasesTotalActive)
          ];
        })
      );
      return success();
    } catch (error) {
      debug(`Failed to get list of CodePush deployments - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${this.identifier} does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold(`${scriptName} apps list`)} to see what apps you have access to.`;
        return failure(ErrorCodes.NotFound, appNotFoundErrorMsg);
      } else if (error.statusCode === 400) {
        const deploymentNotExistErrorMsg = `The deployment ${chalk.bold(this.deploymentName)} does not exist.`;
        return failure(ErrorCodes.Exception, deploymentNotExistErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, error.response.body);
      }
    }
  }

  private generateReleaseMetricsString(release: models.CodePushRelease, metrics: models.CodePushReleaseMetric[], releasesTotalActive: number): string {
    let metricsString: string = "";

    const releaseMetrics: models.CodePushReleaseMetric = metrics.find((metric) => metric.label === release.label);
    if (releaseMetrics) {

      const activePercent: number = (releaseMetrics.downloaded) ? releaseMetrics.active / releasesTotalActive * 100 : 0.0;
      let percentString: string;
      if (activePercent === 100.0) {
        percentString = "100%";
      } else if (activePercent === 0.0) {
        percentString = "0%";
      } else {
        percentString = activePercent.toPrecision(2) + "%";
      }

      metricsString += chalk.green("Active: ") + percentString + ` (${releaseMetrics.active} of ${releasesTotalActive})\n`;
      metricsString += chalk.green("Installed: ") + releaseMetrics.installed;

      const pending: number = releaseMetrics.downloaded - releaseMetrics.installed - releaseMetrics.failed;
      if (pending) {
        metricsString += ` (${pending} pending)`;
      }

      if (releaseMetrics.failed > 0) {
        metricsString += "\n" + chalk.red("Rollback: " + releaseMetrics.failed);
      }

      if (release.rollout && release.rollout !== 100) {
        metricsString += "\n" + chalk.green("Rollout: ") + release.rollout + "%";
      }

    } else {
      metricsString = chalk.magenta("No installs recorded");
    }

    if (release.isDisabled) {
      metricsString += "\n" + chalk.green("Disabled: ") + "Yes";
    }

    return metricsString;
  }
}
