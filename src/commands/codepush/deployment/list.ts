import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, shortName, longName } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import chalk from "chalk";
import { scriptName } from "../../../util/misc";
import { formatDate } from "./lib/date-helper";

const debug = require("debug")("appcenter-cli:commands:codepush:deployments:list");

@help("List the deployments associated with an app")
export default class CodePushDeploymentListListCommand extends AppCommand {

  @help("Specifies whether to display the deployment keys")
  @shortName("k")
  @longName("displayKeys")
  public displayKeys: boolean;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;
    let deployments: models.Deployment[];
    try {
      const httpRequest = await out.progress("Getting CodePush deployments...", clientRequest<models.Deployment[]>(
        (cb) => client.codePushDeployments.list(app.ownerName, app.appName, cb)));
      deployments = httpRequest.result;

      if (this.displayKeys) {
        out.table(out.getCommandOutputTableOptions(this.generateColoredTableTitles(["Name", "Key"])),
          deployments.map((deployment) => [deployment.name, deployment.key])
        );
      } else {
        out.text("Note: To display deployment keys add -k|--displayKeys option");

        out.table(out.getCommandOutputTableOptions(this.generateColoredTableTitles(["Name", "Update Metadata", "Install Metrics"])),
          await this.generateTableInfoRows(deployments, client)
        );
      }

      return success();
    } catch (error) {
      debug(`Failed to get list of Codepush deployments - ${inspect(error)}`);
      if (error.statusCode === 404) {
        const appNotFoundErrorMsg = `The app ${this.identifier} does not exist. Please double check the name, and provide it in the form owner/appname. \nRun the command ${chalk.bold(`${scriptName} apps list`)} to see what apps you have access to.`;
        return failure(ErrorCodes.InvalidParameter, appNotFoundErrorMsg);
      } else {
        return failure(ErrorCodes.Exception, "Failed to get list of deployments for the app");
      }
    }
  }

  private generateColoredTableTitles(tableTitles: string[]): string[] {
    return tableTitles.map((title) => chalk.cyan(title));
  }

  private async generateTableInfoRows(deployments: models.Deployment[], client: AppCenterClient): Promise<string[][]> {
    return await Promise.all(deployments.map(async (deployment: models.Deployment): Promise<string[]> => {
      let metadataString: string = "";
      let metricsString: string = "";

      if (deployment.latestRelease) {
        metadataString = this.generateMetadataString(deployment.latestRelease);
        metricsString = await this.getMetricsString(deployment, client);

      } else {
        metadataString = chalk.magenta("No updates released");
        metricsString = chalk.magenta("No installs recorded");
      }

      return [deployment.name, metadataString, metricsString];
    }));
  }

  private async getMetricsString(deployment: models.Deployment, client: AppCenterClient): Promise<string> {
    let metrics: models.CodePushReleaseMetric[];
    const httpRequest = await out.progress("Getting CodePush deployments metrics...", clientRequest<models.CodePushReleaseMetric[]>(
      (cb) => client.codePushDeploymentMetrics.get(deployment.name, this.app.ownerName, this.app.appName, cb)));
    metrics = httpRequest.result;

    let releasesTotalActive: number = 0;
    metrics.forEach((metric) => releasesTotalActive += metric.active);

    const releaseMetrics: models.CodePushReleaseMetric = metrics.find((metric) => metric.label === deployment.latestRelease.label);

    return this.generateMetricsString(releaseMetrics, releasesTotalActive);
  }

  private generateMetricsString(releaseMetrics: models.CodePushReleaseMetric, releasesTotalActive: number): string {
    if (releaseMetrics) {
      let metricsString: string = "";

      const activePercent: number = (releasesTotalActive) ? releaseMetrics.active / releasesTotalActive * 100 : 0.0;
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

  private generateMetadataString(release: models.CodePushRelease): string {
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
