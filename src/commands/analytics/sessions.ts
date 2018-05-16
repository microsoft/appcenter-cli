import { AppCommand, CommandArgs, CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName, success } from "../../util/commandline";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { out, supportsCsv } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { DefaultApp } from "../../util/profile";
import { parseDate } from "./lib/date-parsing-helper";
import { calculatePercentChange } from "./lib/percent-change-helper";
import { startDateHelpMessage, endDateHelpMessage } from "./lib/analytics-constants";

const debug = require("debug")("appcenter-cli:commands:analytics:sessions");
const IsoDuration = require("iso8601-duration");

@help("Show statistics for sessions")
export default class SessionCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);

    supportsCsv(this.additionalSupportedOutputFormats);
  }

  @help(startDateHelpMessage)
  @shortName("s")
  @longName("start")
  @hasArg
  public startDate: string;

  @help(endDateHelpMessage)
  @shortName("e")
  @longName("end")
  @hasArg
  public endDate: string;

  @help("Specify app version to show statistics for")
  @shortName("V")
  @longName("app-version")
  @hasArg
  public appVersion: string;

  @help("Show session durations")
  @longName("durations")
  public duration: boolean;

  @help("Show session statistics")
  @longName("statistics")
  public statistics: boolean;

  @longName("output")
  @help("Format of output for this command: json, csv")
  @hasArg
  public format: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    const appVersion = this.getAppVersion();
    const startDate = parseDate(this.startDate,
      new Date(new Date().setHours(0, 0, 0, 0)),
      `start date value ${this.startDate} is not a valid date string`);
    const endDate = parseDate(this.endDate,
      new Date(),
      `end date value ${this.endDate} is not a valid date string`);

    if (!this.duration && !this.statistics) {
      // when no switches are specified, all the data should be shown
      this.duration = this.statistics = true;
    }

    const promises: Array<Promise<any>> = [];
    const requestResult: IRequestsResult = {};

    // durations statistics required for both "duration" and "statistics" switches
    promises.push(this.loadSessionDurationsStatistics(client, app, startDate, endDate, appVersion)
      .then((distributions) => requestResult.sessionDurationsDistribution = distributions));

    if (this.statistics) {
      promises.push(this.loadSessionCountsStatistics(client, app, startDate, endDate, appVersion)
        .then((counts: models.DateTimeCounts[]) => requestResult.sessionCounts = counts));

      // get session counts for the previous interval of the same length
      const previousEndDate = startDate;
      const previousStartDate = new Date(previousEndDate.valueOf() - (endDate.valueOf() - startDate.valueOf()));
      promises.push(this.loadSessionCountsStatistics(client, app, previousStartDate, previousEndDate, appVersion)
        .then((counts: models.DateTimeCounts[]) => requestResult.previousSessionCounts = counts));
    }

    await out.progress("Loading statistics...", Promise.all(promises));

    const outputObject: IJsonOutput = this.toJsonOutput(requestResult);

    this.outputStatistics(outputObject);

    return success();
  }

  private getAppVersion(): string[] {
    return !_.isNil(this.appVersion) ? [this.appVersion] : undefined;
  }

  private async loadSessionDurationsStatistics(client: AppCenterClient, app: DefaultApp, startDate: Date, endDate: Date, appVersion?: string[]): Promise<models.SessionDurationsDistribution> {
    try {
      return (await clientRequest<models.SessionDurationsDistribution>((cb) => client.analytics.sessionDurationsDistributionMethod(startDate, app.ownerName, app.appName, {
        end: endDate,
        versions: appVersion
      }, cb))).result;
    } catch (error) {
      debug(`Failed to get sessions duration distributions - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get sessions duration distributions");
    }
  }

  private async loadSessionCountsStatistics(client: AppCenterClient, app: DefaultApp, startDate: Date, endDate: Date, appVersion?: string[]): Promise<models.DateTimeCounts[]> {
    try {
      const httpResponse = await clientRequest<models.DateTimeCounts[]>((cb) => client.analytics.sessionCounts(startDate, "P1D", app.ownerName, app.appName, {
        end: endDate,
        versions: appVersion
      }, cb));

      return httpResponse.result;
    } catch (error) {
      debug(`Failed to get session counts - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get session counts");
    }
  }

  private toJsonOutput(requestsResult: IRequestsResult): IJsonOutput {
    const jsonOutput: IJsonOutput = {};

    if (this.duration) {
      jsonOutput.sessions = requestsResult.sessionDurationsDistribution.distribution;
    }

    if (this.statistics) {
      const totalSessionsCount = _.sumBy(requestsResult.sessionCounts, ((dateTimeCounts) => dateTimeCounts.count));
      const previousTotalSessionsCount = _.sumBy(requestsResult.previousSessionCounts, ((dateTimeCounts) => dateTimeCounts.count));

      const averageSessionsPerDay = totalSessionsCount / requestsResult.sessionCounts.length;
      const previousAverageSessionsPerDay = previousTotalSessionsCount / requestsResult.previousSessionCounts.length;

      const averageSessionDuration: number = IsoDuration.toSeconds(IsoDuration.parse(requestsResult.sessionDurationsDistribution.averageDuration));
      const previousAverageSessionDuration: number = IsoDuration.toSeconds(IsoDuration.parse(requestsResult.sessionDurationsDistribution.previousAverageDuration));

      jsonOutput.statistics = {
        totalSessions: {
          count: totalSessionsCount,
          percentage: calculatePercentChange(totalSessionsCount, previousTotalSessionsCount)
        },
        averageSessionsPerDay: {
          count: averageSessionsPerDay,
          percentage: calculatePercentChange(averageSessionsPerDay, previousAverageSessionsPerDay)
        },
        averageSessionsLength: {
          seconds: averageSessionDuration,
          percentage: calculatePercentChange(averageSessionDuration, previousAverageSessionDuration)
        }
      };
    }

    return jsonOutput;
  }

  private outputStatistics(statisticsObject: IJsonOutput): void {
    out.reportObjectAsTitledTables((stats: IJsonOutput, numberFormatter, dateFormatter, percentageFormatter) => {
      const tableArray: out.NamedTables = [];

      if (stats.sessions) {
        tableArray.push({
          name: "Session Durations",
          content: [["", "Count"]].concat(stats.sessions.map((group) => [group.bucket, numberFormatter(group.count)]))
      });
      }

      if (stats.statistics) {
        tableArray.push({
          name: "Session Statistics",
          content: [
            ["", "Count", "Change"],
            ["Total Sessions"].concat(toArray(stats.statistics.totalSessions, numberFormatter, percentageFormatter)),
            ["Average Sessions Per Day"].concat(toArray(stats.statistics.averageSessionsPerDay, numberFormatter, percentageFormatter)),
            ["Average Session Length (sec)", numberFormatter(stats.statistics.averageSessionsLength.seconds), percentageFormatter(stats.statistics.averageSessionsLength.percentage)]
          ]
        });
      }

      return tableArray;
    }, statisticsObject);
  }
}

interface IRequestsResult {
  sessionDurationsDistribution?: models.SessionDurationsDistribution;
  sessionCounts?: models.DateTimeCounts[];
  previousSessionCounts?: models.DateTimeCounts[];
}

interface IJsonOutput {
  sessions?: models.SessionDurationsDistributionDistributionItem[];
  statistics?: {
    totalSessions: IChangingCount;
    averageSessionsPerDay: IChangingCount;
    averageSessionsLength: {
      seconds: number,
      percentage: number;
    }
  };
}

interface IChangingCount {
  count: number;
  percentage: number;
}

function toArray(changingCount: IChangingCount, numberFormatter: (num: number) => string, percentageFormatter: (value: number) => string): string[] {
  return [numberFormatter(changingCount.count), percentageFormatter(changingCount.percentage)];
}
