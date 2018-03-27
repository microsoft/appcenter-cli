import { AppCommand, CommandArgs, CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName, success, defaultValue } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../../util/apis";
import { out, supportsCsv } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { DefaultApp } from "../../../util/profile";
import { parseDate } from "../lib/date-parsing-helper";
import { calculatePercentChange } from "../lib/percent-change-helper";
import { startDateHelpMessage, endDateHelpMessage } from "../lib/analytics-constants";

const debug = require("debug")("appcenter-cli:commands:analytics:events:show");
const pLimit = require("p-limit");

@help("Show statistics for events")
export default class ShowCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);

    supportsCsv(this.additionalSupportedOutputFormats);
  }

  private static readonly numberOfParallelRequests = 10;

  @help("Show statistics about event properties")
  @longName("properties")
  public properties: boolean;

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

  @help("Filter the list of events by app version")
  @shortName("V")
  @longName("app-version")
  @hasArg
  public appVersion: string;

  @help("Introduce the number of events that are being displayed. By default, all the events will be shown")
  @shortName("c")
  @longName("number-of-events")
  @hasArg
  @defaultValue("200")
  public eventCount: string;

  @help("Filter the metrics to a specific event name")
  @shortName("n")
  @longName("event-name")
  @hasArg
  public eventName: string;

  @longName("output")
  @help("Format of output for this command: json, csv")
  @hasArg
  public format: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    const appVersion = this.toArrayWithSingleElement(this.appVersion);
    const eventName = this.toArrayWithSingleElement(this.eventName);
    const startDate = parseDate(this.startDate,
      new Date(new Date().setHours(0, 0, 0, 0)),
      `start date value ${this.startDate} is not a valid date string`);
    const endDate = parseDate(this.endDate,
      new Date(),
      `end date value ${this.endDate} is not a valid date string`);
    const eventCount = this.getEventCount();

    const events: IEventStatistics[] = await out.progress(`Loading statistics...`, this.getEvents(client, app, startDate, endDate, eventCount, this.properties, appVersion, eventName));

    this.outputStatistics(events);

    return success();
  }

  private toArrayWithSingleElement(value: string): string[] {
    return !_.isNil(value) ? [value] : undefined;
  }

  private getEventCount(): number {
    const eventCount = Number(this.eventCount);
    if (Number.isSafeInteger(eventCount) && eventCount >= 0) {
      return eventCount;
    } else {
      throw failure(ErrorCodes.InvalidParameter, "--number-of-events should be non-negative integer");
    }
  }

  private async getEvents(client: AppCenterClient, app: DefaultApp, startDate: Date, endDate: Date, eventCount: number, loadProperties: boolean, appVersions: string[] | undefined, eventNames: string[] | undefined): Promise<IEventStatistics[]> {
    let eventsStatistics: IEventStatistics[];
    try {
      const httpContent = await clientRequest<models.Events>((cb) => client.analytics.eventsMethod(startDate, app.ownerName, app.appName, {
        end: endDate,
        versions: appVersions,
        orderby: "count desc",
        top: eventCount,
        skip: 0,
        eventName: eventNames,
        inlinecount: "allpages"
      }, cb));

      eventsStatistics = httpContent.result.events.map((event) => ({
        name: event.name,
        count: event.count,
        countChange: calculatePercentChange(event.count, event.previousCount),
        users: event.deviceCount,
        userChange: calculatePercentChange(event.deviceCount, event.previousDeviceCount),
        perUser: event.countPerDevice,
        perSession: event.countPerSession
      }));
    } catch (error) {
      debug(`Failed to get events statistics - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get events statistics");
    }

    if (loadProperties) {
      const limit = pLimit(ShowCommand.numberOfParallelRequests);
      const propertiesPromises = eventsStatistics.map((eventStats) => this.getProperties(client, app, eventStats.name, startDate, endDate, appVersions, limit));

      (await Promise.all(propertiesPromises)).forEach((properties, index) => eventsStatistics[index].properties = properties);
    }

    return eventsStatistics;
  }

  private async getProperties(client: AppCenterClient, app: DefaultApp, eventName: string, startDate: Date, endDate: Date, appVersions: string[] | undefined, limit: any): Promise<IPropertyStatistics[]> {
    let propertiesNames: string[];
    try {
      const httpContent = await (limit(() => clientRequest<models.EventProperties>((cb) => client.analytics.eventPropertiesMethod(eventName, app.ownerName, app.appName, cb))) as Promise<ClientResponse<models.EventProperties>>);

      propertiesNames = httpContent.result.eventProperties;
    } catch (error) {
      debug(`Failed to get event properties of event ${eventName} - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `failed to get event properties of event ${eventName}`);
    }

    const valuesStatsPromises = propertiesNames.map((propertyName) => this.getPropertyValueStatistics(client, app, eventName, propertyName, startDate, endDate, appVersions, limit));

    return (await Promise.all(valuesStatsPromises)).map((valueStats, index) => ({
      name: propertiesNames[index],
      valuesStatistics: valueStats
    }));
  }

  private async getPropertyValueStatistics(client: AppCenterClient, app: DefaultApp, eventName: string, eventPropertyName: string, startDate: Date, endDate: Date, appVersions: string[] | undefined, limit: any): Promise<IPropertyValueStatistics[]> {
    try {
      const httpContent = await (limit(() => clientRequest<models.EventPropertyValues>((cb) => client.analytics.eventPropertyCounts(eventName, eventPropertyName, startDate, app.ownerName, app.appName, {
        end: endDate,
        versions: appVersions
      }, cb))) as Promise<ClientResponse<models.EventPropertyValues>>);

      return httpContent.result.values.map((value) => ({
        value: value.name,
        count: value.count,
        countChange: calculatePercentChange(value.count, value.previousCount),
      }));
    } catch (error) {
      debug(`Failed to get values of property ${eventPropertyName} of event ${eventName} - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `failed to get values of property ${eventPropertyName} of event ${eventName}`);
    }
  }

  private outputStatistics(statistics: IEventStatistics[]) {
    out.reportObjectAsTitledTables((events, numberFormatter, dateFormatter, percentageFormatter) => {
      const table: out.NamedTables = [];
      const eventsTable: out.INamedTable = {
        name: "Events",
        content: [["Name", "Count", "Count Change", "Users", "User Change", "Per User", "Per Session"]]
      };

      table.push(eventsTable);

      for (const event of events) {
        eventsTable.content.push([event.name, numberFormatter(event.count), percentageFormatter(event.countChange),
          numberFormatter(event.users), percentageFormatter(event.userChange), numberFormatter(event.perUser), numberFormatter(event.perSession)]);

        if (event.properties) {
          for (const property of event.properties) {
            eventsTable.content.push({
              name: property.name,
              content: [["Value", "Count", "Count Change"]].concat(
                property.valuesStatistics.map((valueStats) => [valueStats.value, numberFormatter(valueStats.count), percentageFormatter(valueStats.countChange)]))
            });
          }
        }
      }

      return table;
    }, statistics);
  }
}

interface IEventStatistics {
  name: string;
  count: number;
  countChange: number;
  users: number;
  userChange: number;
  perUser: number;
  perSession: number;
  properties?: IPropertyStatistics[];
}

interface IPropertyStatistics {
  name: string;
  valuesStatistics: IPropertyValueStatistics[];
}

interface IPropertyValueStatistics {
  value: string;
  count: number;
  countChange: number;
}
