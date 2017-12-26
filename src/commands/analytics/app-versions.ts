import { AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success } from "../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import * as Request from "request";
import * as Path from "path";
import * as Pfs from "../../util/misc/promisfied-fs";
import { DefaultApp } from "../../util/profile";
import * as Os from "os";
import { parseDate } from "./lib/date-parsing-helper";
import { startDateHelpMessage, endDateHelpMessage } from "./lib/analytics-constants";

const debug = require("debug")("appcenter-cli:commands:analytics:app-versions");

@help("Shows versions of the application")
export default class ShowAppVersionsCommand extends AppCommand {
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

  @help("Show device count for each version")
  @longName("devices")
  public devices: boolean;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    const startDate = parseDate(this.startDate,
      new Date(new Date().setHours(0, 0, 0, 0)),
      `start date value ${this.startDate} is not a valid date string`);

    const endDate = parseDate(this.endDate,
      new Date(),
      `end date value ${this.endDate} is not a valid date string`);

    let listOfVersions: models.Version[];
    try {
      const httpRequest = await out.progress("Getting list of application versions...",
        clientRequest<models.Versions>((cb) => client.analytics.analytics.versionsMethod(app.ownerName, app.appName, startDate, {
          end: endDate
        }, cb)));
      listOfVersions = httpRequest.result.versions;
    } catch (error) {
      debug(`Failed to get list of application versions - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get list of application versions");
    }

    if (this.devices) {
      const outputArray = listOfVersions.map((version) => [version.version, String(version.count)]);
      out.table(out.getCommandOutputTableOptions(["Version", "Number Of Devices"]), outputArray);
    } else {
      out.text((versions) => versions.join(Os.EOL), listOfVersions.map((version) => version.version));
    }

    return success();
  }
}
