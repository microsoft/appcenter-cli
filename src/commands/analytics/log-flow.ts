import { AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName, success} from "../../util/commandline";
import { MobileCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";
import { StreamingArrayOutput } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { DefaultApp } from "../../util/profile";
import * as ContinuousPollingHelper from "../../util/continuous-polling/continuous-polling-helper";

const debug = require("debug")("mobile-center-cli:commands:analytics:log-flow");

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

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    this.validateParameters();

    const logsCount = Number(this.logsCount) || 100;

    const streamingOutput = new StreamingArrayOutput();
    streamingOutput.start();

    let options: {start: Date};
    await ContinuousPollingHelper.pollContinuously(async (requestsDone: number) => {
      try {
        debug ("Loading logs");
        // start time is not specified for the first request
        return await clientRequest<models.LogContainer>(
          (cb) => requestsDone ? 
            client.analytics.logFlow(app.ownerName, app.appName, options, cb) : 
            client.analytics.logFlow(app.ownerName, app.appName, cb), 
          );        
      } catch (error) {
        debug(`Failed to load the logs - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to load the logs");
      }
    }, (response: ClientResponse<models.LogContainer>, responsesProcessed: number) => {
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

  private filterLogs(logs: models.Log[], installId: string): models.Log[] {
    if (!_.isNil(installId)) {
      return logs.filter((logEntry) => logEntry.installId === installId);
    } else {
      return logs;
    }
  }

  private showLogEntry(output: StreamingArrayOutput, logEntry: models.Log): void {
    // setting common properties
    let logStringArray: string[] = [logEntry.timestamp.toString(), logEntry.installId, logEntry.type];
    const jsonObject: ILogEntryJsonObject = {
      date: logEntry.timestamp,
      installId: logEntry.installId,
      logType: logEntry.type
    };

    // adding log id
    if (isEventLog(logEntry)) {
      // event name for event log
      logStringArray.push(logEntry.name);
      jsonObject.logId = logEntry.name;
    } else if (isILogWithSessionId(logEntry)) {
      // session id for logs with such property
      logStringArray.push(logEntry.sessionId);
      jsonObject.logId = logEntry.sessionId;
    }

    // adding properties
    if (isLogWithProperties(logEntry)) {
      if (_.size(logEntry.properties)) {
        logStringArray = logStringArray.concat(_.toPairs(logEntry.properties).map((pair) => pair.join(": ")));
      }
      jsonObject.properties = logEntry.properties;
    }

    output.text(() => logStringArray.join(", "), jsonObject);
  }
}

function isLogWithProperties(log: models.Log): log is models.LogWithProperties {
  return  _.isPlainObject(_.get(log, "properties"));
}

function isEventLog(log: models.Log): log is models.EventLog {
  return isLogWithProperties(log) && log.type === "event";
}

interface ILogWithSessionId extends models.Log {
  sessionId: string;
}

function isILogWithSessionId(log: models.Log): log is ILogWithSessionId {
  return _.isString(_.get(log, "sessionId"));
}

interface ILogEntryJsonObject {
  date: Date;
  installId: string;
  logType: string;
  logId?: string;
  properties?: { [propertyName: string]: string };
}
