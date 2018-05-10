import { AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success } from "../../util/commandline";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { StreamingArrayOutput } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import * as ContinuousPollingHelper from "../../util/continuous-polling/continuous-polling-helper";

const debug = require("debug")("appcenter-cli:commands:build:logs");

@help("Displays log for build")
export default class DisplayLogsStatusCommand extends AppCommand {
  private static readonly delayBetweenRequests = 3000;

  @help("ID of build to show logs for")
  @shortName("i")
  @longName("id")
  @required
  @hasArg
  public buildId: string;

  @help("Number of last lines to be shown")
  @shortName("l")
  @longName("lines")
  @hasArg
  public lines: string;

  @help("Continue to return logs, press Ctrl+C to exit")
  @shortName("c")
  @longName("continue")
  public showContinuously: boolean;

  async run(client: AppCenterClient): Promise<CommandResult> {
    // validate build id
    const buildIdNumber = Number(this.buildId);

    if (!Number.isSafeInteger(buildIdNumber) || buildIdNumber < 1) {
      return failure(ErrorCodes.InvalidParameter, "build id should be positive integer");
    }

    // validate lines number
    let numberOfLines: number;
    if (!_.isNil(this.lines)) {
      numberOfLines = Number(this.lines);
      if (!Number.isSafeInteger(numberOfLines) || numberOfLines < 1) {
        return failure(ErrorCodes.InvalidParameter, "number of lines should be positive integer");
      }
    } else {
      numberOfLines = Number.MAX_SAFE_INTEGER;
    }

    const app = this.app;

    const streamingOutput = new StreamingArrayOutput();
    streamingOutput.start();

    let skippedAndShownLogsCount: number;
    await ContinuousPollingHelper.pollContinuously(async () => {
      try {
        debug(`Downloading logs for build ${this.buildId}`);
        return await clientRequest<models.BuildLog>((cb) => client.builds.getLog(buildIdNumber, app.ownerName, app.appName, cb));
      } catch (error) {
        debug(`Request failed - ${inspect(error)}`);
        switch (error.statusCode) {
          case 401:
            throw failure(ErrorCodes.Exception, "failed to get build logs because the authentication has failed");
          case 404:
            throw failure(ErrorCodes.InvalidParameter, `failed to get build logs because build ${buildIdNumber} doesn't exist`);
          default:
            throw failure(ErrorCodes.Exception, "failed to get build logs");
        }
      }
    }, (response, responsesProcessed) => {
      // processing response
      const logs = response.result.value;
      let filteredLogs: string[];
      if (responsesProcessed) {
        filteredLogs = _.drop(logs, skippedAndShownLogsCount);
        skippedAndShownLogsCount += filteredLogs.length;
      } else {
        filteredLogs = _.takeRight(logs, Math.min(numberOfLines, logs.length));
        skippedAndShownLogsCount = logs.length;
      }

      if (!this.showContinuously && filteredLogs.length === 0) {
        streamingOutput.text(_.constant(""), "No log entries were found");
      } else {
        for (const log of filteredLogs) {
          streamingOutput.text(_.constant(log), log);
        }
      }
    }, this.showContinuously, DisplayLogsStatusCommand.delayBetweenRequests, `Downloading logs for build ${this.buildId}...`);

    streamingOutput.finish();

    return success();
  }
}
