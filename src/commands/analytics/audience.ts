import { AppCommand, CommandArgs, CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName, success } from "../../util/commandline";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { out, supportsCsv } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { DefaultApp } from "../../util/profile";
import { parseDate } from "./lib/date-parsing-helper";
import { startDateHelpMessage, endDateHelpMessage } from "./lib/analytics-constants";

const debug = require("debug")("appcenter-cli:commands:analytics:audience");

@help("Show audience statistics")
export default class AudienceCommand extends AppCommand {
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

  @help("Show devices statistics")
  @longName("devices")
  public devices: boolean;

  @help("Show country statistics")
  @longName("countries")
  public countries: boolean;

  @help("Show languages statistics")
  @longName("languages")
  public languages: boolean;

  @help("Show active users statistics")
  @longName("active-users")
  public activeUsers: boolean;

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

    if (!this.devices && !this.countries && !this.languages && !this.activeUsers) {
      // when no switches are specified, all the data should be shown
      this.devices = this.countries = this.languages = this.activeUsers = true;
    }

    const promises: Array<Promise<void>> = [];
    const statistics: IStatisticsObject = {};

    if (this.devices) {
      promises.push(this.loadDevicesStatistics(statistics, client, app, startDate, endDate, appVersion));
    }

    if (this.countries) {
      promises.push(this.loadCountriesStatistics(statistics, client, app, startDate, endDate, appVersion));
    }

    if (this.languages) {
      promises.push(this.loadLanguagesStatistics(statistics, client, app, startDate, endDate, appVersion));
    }

    if (this.activeUsers) {
      promises.push(this.loadActiveUsersStatistics(statistics, client, app, startDate, endDate, appVersion));
    }

    await out.progress("Loading statistics...", Promise.all(promises));

    this.outputStatistics(statistics);

    return success();
  }

  private getAppVersion(): string[] {
    return !_.isNil(this.appVersion) ? [this.appVersion] : undefined;
  }

  private async loadDevicesStatistics(statisticsObject: IStatisticsObject, client: AppCenterClient, app: DefaultApp, startDate: Date, endDate: Date, appVersion?: string[]): Promise<void> {
    try {
      const httpRequest = await clientRequest<models.AnalyticsModels>((cb) => client.analytics.modelCounts(startDate, app.ownerName, app.appName, {
        end: endDate,
        versions: appVersion
      }, cb));

      const result = httpRequest.result;
      statisticsObject.devices = result.modelsProperty.map((model) => ({
        count: model.count,
        value: model.modelName,
        percentage: calculatePercentage(model.count, result.total)
      }));
    } catch (error) {
      debug(`Failed to get devices count statistics - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get devices count statistics");
    }
  }

  private async loadCountriesStatistics(statisticsObject: IStatisticsObject, client: AppCenterClient, app: DefaultApp, startDate: Date, endDate: Date, appVersion?: string[]): Promise<void> {
    try {
      const httpRequest = await clientRequest<models.Places>((cb) => client.analytics.placeCounts(startDate, app.ownerName, app.appName, {
        end: endDate,
        versions: appVersion
      }, cb));

      const result = httpRequest.result;
      statisticsObject.countries = result.places.map((place) => ({
        count: place.count,
        value: place.code,
        percentage: calculatePercentage(place.count, result.total)
      }));
    } catch (error) {
      debug(`Failed to get countries statistics - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get countries statistics");
    }
  }

  private async loadLanguagesStatistics(statisticsObject: IStatisticsObject, client: AppCenterClient, app: DefaultApp, startDate: Date, endDate: Date, appVersion?: string[]): Promise<void> {
    try {
      const httpRequest = await clientRequest<models.Languages>((cb) => client.analytics.languageCounts(startDate, app.ownerName, app.appName, {
        end: endDate,
        versions: appVersion
      }, cb));

      const result = httpRequest.result;
      statisticsObject.languages = result.languages.map((language) => ({
        count: language.count,
        value: language.languageName,
        percentage: calculatePercentage(language.count, result.total)
      }));
    } catch (error) {
      debug(`Failed to get languages statistics - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get languages statistics");
    }
  }

  private async loadActiveUsersStatistics(statisticsObject: IStatisticsObject, client: AppCenterClient, app: DefaultApp, startDate: Date, endDate: Date, appVersion?: string[]): Promise<void> {
    try {
      const httpRequest = await clientRequest<models.ActiveDeviceCounts>((cb) => client.analytics.deviceCounts(startDate, app.ownerName, app.appName, {
        end: endDate,
        versions: appVersion
      }, cb));

      const result = httpRequest.result;

      statisticsObject.activeUsers = result.daily.map((dailyData, index) => ({
        date: new Date(dailyData.datetime),
        daily: dailyData.count,
        weekly: result.weekly[index].count,
        monthly: result.monthly[index].count
      }));
    } catch (error) {
      debug(`Failed to get active users statistics - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get active users statistics");
    }
  }

  private outputStatistics(statisticsObject: IStatisticsObject): void {
    out.reportObjectAsTitledTables((stats: IStatisticsObject, numberFormatter, dateFormatter, percentageFormatter) => {
      const tableArray: out.NamedTables = [];

      if (stats.devices) {
        tableArray.push({
          name: "Devices",
          content: [["", "Count", "Change"]].concat(stats.devices.map((device) => toArray(device, numberFormatter, percentageFormatter)))
        });
      }

      if (stats.countries) {
        tableArray.push({
          name: "Countries",
          content: [["", "Count", "Change"]].concat(stats.countries.map((country) => toArray(country, numberFormatter, percentageFormatter)))
        });
      }

      if (stats.languages) {
        tableArray.push({
          name: "Languages",
          content: [["", "Count", "Change"]].concat(stats.languages.map((language) => toArray(language, numberFormatter, percentageFormatter)))
        });
      }

      if (stats.activeUsers) {
        tableArray.push({
          name: "Active Users",
          content: [["Date", "Monthly", "Weekly", "Daily"]]
            .concat(stats.activeUsers.map((activeUsersStatistics) => [
              dateFormatter(activeUsersStatistics.date),
              numberFormatter(activeUsersStatistics.monthly),
              numberFormatter(activeUsersStatistics.weekly),
              numberFormatter(activeUsersStatistics.daily)
            ]))
        });
      }

      return tableArray;
    }, statisticsObject);
  }
}

interface IStatisticsObject {
  devices?: IStatisticsForValue[];
  countries?: IStatisticsForValue[];
  languages?: IStatisticsForValue[];
  activeUsers?: IActiveUsersCount[];
}

interface IStatisticsForValue {
  count: number;
  value: string;
  percentage: number;
}

function toArray(stats: IStatisticsForValue, numberFormatter: (num: number) => string, percentageFormatter: (percentage: number) => string): string[] {
  return [stats.value, numberFormatter(stats.count), percentageFormatter(stats.percentage)];
}

function calculatePercentage(count: number, total: number): number {
  return count / total * 100;
}

interface IActiveUsersCount {
  date: Date;
  daily: number;
  weekly: number;
  monthly: number;
}
