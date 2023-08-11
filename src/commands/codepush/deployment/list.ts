import * as chalk from "chalk";
import { inspect } from "util";
import { AppCenterClient, models } from "../../../util/apis";
import {
  AppCommand,
  CommandArgs,
  CommandResult,
  ErrorCodes,
  failure,
  help,
  longName,
  shortName,
  success,
} from "../../../util/commandline";
import { formatIsJson, out } from "../../../util/interaction";
import { scriptName } from "../../../util/misc";
import { promiseMap } from "../../../util/misc/promise-map";
import { formatDate } from "./lib/date-helper";

const debug = require("debug")("appcenter-cli:commands:codepush:deployments:list");
const PROMISE_CONCURRENCY = 30;

@help("List the deployments associated with an app")
export default class CodePushDeploymentListListCommand extends AppCommand {
  @help("Specifies whether to display the deployment keys")
  @shortName("k")
  @longName("displayKeys")
  public displayKeys: boolean;

  @help("Specifies whether to fetch deployment metrics")
  @shortName("s")
  @longName("skipFetchingDeploymentMetrics")
  public skipFetchingDeploymentMetrics: boolean;
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;
    let deployments: models.CodePushDeploymentsListResponse;
    try {
      deployments = await out.progress("Getting CodePush deployments...", client.codePushDeployments.list(app.ownerName, app.appName));

      if (this.displayKeys) {
        out.table(
          out.getCommandOutputTableOptions(this.generateColoredTableTitles(["Name", "Key"])),
          deployments.map((deployment) => [deployment.name, deployment.key])
        );
      } else {
        out.text("Note: To display deployment keys add -k|--displayKeys option");

        out.table(
          out.getCommandOutputTableOptions(this.generateColoredTableTitles(["Name", "Update Metadata", "Install Metrics"])),
          await this.generateInfo(deployments, client)
        );
      }

      return success();
    } catch (error) {
      debug(`Failed to get list of Codepush deployments - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${
          this.identifier
        } does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold(
          `${scriptName} apps list`
        )} to see what apps you have access to.`;
        return failure(ErrorCodes.InvalidParameter, appNotFoundErrorMsg);
      } else {
        let message = "Failed to get list of deployments for the app";
        if (error.statusCode === 429) {
          message =
            message +
            ". Too many requests. Try disabling metrics request for each deployment by using -s | --skipFetchingDeploymentMetrics flag.";
        }
        return failure(ErrorCodes.Exception, message);
      }
    }
  }

  private generateColoredTableTitles(tableTitles: string[]): string[] {
    return tableTitles.map((title) => chalk.cyan(title));
  }

  private async generateInfo(deployments: models.CodePushDeploymentsListResponse, client: AppCenterClient) {
    return await promiseMap(
      deployments,
      async (deployment) => {
        if (formatIsJson()) {
          if (!deployment.latestRelease || this.skipFetchingDeploymentMetrics) {
            return deployment;
          }

          const metricsJSON: models.CodePushReleaseMetric = await this.generateMetricsJSON(deployment, client);

          if (metricsJSON) {
            return { deployment: deployment, metrics: metricsJSON };
          }

          return deployment;
        }

        let metadataString: string = "";
        let metricsString: string = "";

        if (deployment.latestRelease) {
          metadataString = this.generateMetadataString(deployment.latestRelease);
          metricsString = this.skipFetchingDeploymentMetrics ? "" : await this.getMetricsString(deployment, client);
        } else {
          metadataString = chalk.magenta("No updates released");
          metricsString = chalk.magenta("No installs recorded");
        }

        return [deployment.name, metadataString, metricsString];
      },
      PROMISE_CONCURRENCY
    );
  }

  private async generateMetricsJSON(deployment: models.Deployment, client: AppCenterClient): Promise<models.CodePushReleaseMetric> {
    const metrics = await this.getMetrics(deployment, client);

    if (metrics.length) {
      let releasesTotalActive: number = 0;
      metrics.forEach((metric) => (releasesTotalActive += metric.active));

      const latestMetric = metrics.pop();
      latestMetric.active = releasesTotalActive;
      // latestMetric.totalActive = releasesTotalActive;
      delete latestMetric.label;
      return latestMetric;
    }

    return null;
  }

  private async getMetrics(
    deployment: models.Deployment,
    client: AppCenterClient
  ): Promise<models.CodePushDeploymentMetricsGetResponse> {
    const metrics = await out.progress(
      "Getting CodePush deployments metrics...",
      client.codePushDeploymentMetrics.get(deployment.name, this.app.ownerName, this.app.appName)
    );

    return metrics;
  }

  private async getMetricsString(deployment: models.Deployment, client: AppCenterClient): Promise<string> {
    const metrics: models.CodePushReleaseMetric[] = await this.getMetrics(deployment, client);

    let releasesTotalActive: number = 0;
    metrics.forEach((metric) => (releasesTotalActive += metric.active));

    const releaseMetrics: models.CodePushReleaseMetric = metrics.find((metric) => metric.label === deployment.latestRelease.label);

    return this.generateMetricsString(releaseMetrics, releasesTotalActive);
  }

  private generateMetricsString(releaseMetrics: models.CodePushReleaseMetric, releasesTotalActive: number): string {
    if (releaseMetrics) {
      let metricsString: string = "";

      const activePercent: number = releasesTotalActive ? (releaseMetrics.active / releasesTotalActive) * 100 : 0.0;
      let percentString: string;
      if (activePercent === 100.0) {
        percentString = "100%";
      } else if (activePercent === 0.0) {
        percentString = "0%";
      } else {
        percentString = activePercent.toPrecision(2) + "%";
      }

      metricsString += chalk.green("Active: ") + percentString + ` (${releaseMetrics.active} of ${releasesTotalActive})\n`;
      if (releaseMetrics.installed != null) {
        metricsString += chalk.green("Installed: ") + releaseMetrics.installed;
      }

      const pending: number = releaseMetrics.downloaded - releaseMetrics.installed - releaseMetrics.failed;
      if (pending) {
        metricsString += ` (${pending} pending)`;
      }

      return metricsString;
    } else {
      return chalk.magenta("No installs recorded");
    }
  }

  private generateMetadataString(release: any): string {
    let metadataString: string = "";
    const lineFeed: string = "\n";

    metadataString += chalk.green("Label: ") + release.label + lineFeed;
    metadataString += chalk.green("App Version: ") + release.targetBinaryRange + lineFeed;
    metadataString += chalk.green("Mandatory: ") + (release.isMandatory ? "Yes" : "No") + lineFeed;
    metadataString += chalk.green("Release Time: ") + formatDate(release.uploadTime) + lineFeed;
    metadataString += chalk.green("Released By: ") + release.releasedBy;

    return metadataString;
  }
}
