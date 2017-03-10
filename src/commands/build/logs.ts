import {AppCommand, Command, CommandArgs, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success} from "../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../util/apis";
import { out } from "../../util/interaction";
import * as _ from "lodash";
import * as Process from "process";
import * as MkDirP from "mkdirp";

const debug = require("debug")("mobile-center-cli:commands:build:logs");

@help("Displays log for build")
export default class DisplayLogsStatusCommand extends AppCommand {

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

  async run(client: MobileCenterClient): Promise<CommandResult> {  
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

    debug(`Downloading logs for build ${this.buildId}`);
    const logsResponse = await out.progress(`Downloading logs for build ${this.buildId}...`,
      clientRequest<models.BuildLog>((cb) => client.buildOperations.getBuildLogs(buildIdNumber, app.ownerName, app.appName, cb)));

    if (logsResponse.response.statusCode >= 400) {
      return failure(ErrorCodes.Exception, "the Get Build Logs request was rejected for an unknown reason");
    }

    const logs = logsResponse.result.value;

    // taking only specified number of log entries from the end (or all of them if -l was not specified))
    const filteredLogs = _.takeRight(logs, Math.min(numberOfLines, logs.length));

    filteredLogs.forEach((logEntry) => out.text(logEntry));

    return success();
  }
}
