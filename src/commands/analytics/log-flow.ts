import { AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName, success } from "../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";
import { StreamingArrayOutput } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { DefaultApp } from "../../util/profile";
import * as ContinuousPollingHelper from "../../util/continuous-polling/continuous-polling-helper";

const debug = require("debug")("appcenter-cli:commands:analytics:log-flow");

@help("Command to see the incoming logs in real time")
export default class ShowLogFlowCommand extends AppCommand {
  private static readonly delayBetweenRequests = 3000;

  @help("Introduce the number of logs (max 100) that are being displayed, default number is 100")
  @shortName("l")
  @longName("num-logs")
  @hasArg
  public logsCount: string;

  @help("Filter the logs by install ID")
  @shortName("i")
  @longName("install-id")
  @hasArg
  public installationId: string;

  @help("Continue to return logs, press Ctrl+C to exit")
  @shortName("c")
  @longName("continue")
  public showContinuously: boolean;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    this.validateParameters();

    const logsCount = Number(this.logsCount) || 100;

    const streamingOutput = new StreamingArrayOutput();
    streamingOutput.start();

    let options: {start: Date} = null;
    await ContinuousPollingHelper.pollContinuously(async () => {
      try {
        debug ("Loading logs");
        // start time is not specified for the first request
        return await clientRequest((cb) => client.analytics.genericLogFlow(app.ownerName, app.appName, options, cb));
      } catch (error) {
        debug(`Failed to load the logs - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to load the logs");
      }
    }, (response: ClientResponse<models.GenericLogContainer>, responsesProcessed: number) => {
      // processing http response
      const result = response.result;
      if (result.logs.length) {
        // new logs were received
        options = { start: result.lastReceivedLogTimestamp };

        // take no more than specified number of logs from the first request response
        const filteredLogs = responsesProcessed ? this.filterLogs(result.logs, this.installationId) :
          _.takeRight(this.filterLogs(result.logs, this.installationId), logsCount);
        for (const logEntry of filteredLogs) {
          this.showLogEntry(streamingOutput, logEntry);
        }
      }
    }, this.showContinuously, ShowLogFlowCommand.delayBetweenRequests, "Loading logs...");

    streamingOutput.finish();

    return success();
  }

  private validateParameters(): void {
    if (!_.isNil(this.logsCount)) {
      const parsedNumberOfLogs = Number(this.logsCount);

      if (!Number.isSafeInteger(parsedNumberOfLogs) || parsedNumberOfLogs < 1 || parsedNumberOfLogs > 100) {
        throw failure(ErrorCodes.InvalidParameter, `${this.logsCount} is not a valid number of logs to show`);
      }
    }

    if (!_.isNil(this.installationId)) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/g.test(this.installationId)) {
        throw failure(ErrorCodes.InvalidParameter, `${this.installationId} is not a valid installation identifier`);
      }
    }
  }

  private filterLogs(logs: models.GenericLog[], installId: string): models.GenericLog[] {
    if (!_.isNil(installId)) {
      return logs.filter((logEntry) => logEntry.installId === installId);
    } else {
      return logs;
    }
  }

  private showLogEntry(output: StreamingArrayOutput, logEntry: models.GenericLog): void {
    // setting common properties
    let logStringArray: string[] = [logEntry.timestamp.toString(), logEntry.installId, logEntry.type];
    const jsonObject: ILogEntryJsonObject = {
      date: logEntry.timestamp,
      installId: logEntry.installId,
      logType: logEntry.type
    };

    // adding log id
    if (logEntry.type === "event") {
      // event name for event log
      logStringArray.push(logEntry.eventName);
      jsonObject.logId = logEntry.eventName;
    } else if (logEntry.sessionId != null) {
      // session id for logs with such property
      logStringArray.push(logEntry.sessionId);
      jsonObject.logId = logEntry.sessionId;
    }

    // adding properties
    if (logEntry.properties != null) {
      const logProperties: { [propertyName: string]: string } = logEntry.properties;
      logStringArray = logStringArray.concat(_.toPairs(logProperties).map((pair) => pair.join(": ")));
      jsonObject.properties = logProperties;
    }

    output.text(() => logStringArray.join(", "), jsonObject);
  }
}

interface ILogEntryJsonObject {
  date: Date;
  installId: string;
  logType: string;
  logId?: string;
  properties?: { [propertyName: string]: string };
}
