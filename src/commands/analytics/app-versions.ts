import { AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success } from "../../util/commandline";
import { MobileCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";
import { out } from "../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import * as Request from "request";
import * as Path from "path";
import * as Pfs from "../../util/misc/promisfied-fs";
import { DefaultApp } from "../../util/profile";
import * as Os from "os";

const debug = require("debug")("mobile-center-cli:commands:analytics:app-versions");

@help("Shows versions of the application")
export default class ShowAppVersionsCommand extends AppCommand {
  @help("Start date (e.g. '1970/01/01 00:00' (system time zone), RFC2822 and ISO 8601 date strings are also supported)")
  @shortName("s")
  @longName("start")
  @hasArg
  public startDate: string;

  @help("End date (e.g. '1970/01/01 00:00' (system time zone), RFC2822 and ISO 8601 date strings are also supported)")
  @shortName("e")
  @longName("end")
  @hasArg
  public endDate: string;

  @help("Show device count for each version")
  @longName("devices")
  public devices: boolean;

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    const startDate = this.getStartDate();
    const endDate = this.getEndDate();

    let listOfVersions: models.Version[];
    try {
      const httpRequest = await out.progress("Getting list of application versions...",
        clientRequest<models.Versions>((cb) => client.analytics.versions(startDate, app.ownerName, app.appName, {
          end: endDate
        }, cb)));
      listOfVersions = httpRequest.result.versionsProperty;
    } catch (error) {
      debug(`Failed to get list of application versions - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get list of application versions");
    }

    if (this.devices) {
      const outputArray = [["Version", "Number of devices"]].concat(listOfVersions.map((version) => [version.versionProperty, String(version.count)]));
      out.table(out.getNoTableBordersOptions(), outputArray);
    } else {
      out.text((versions) => versions.join(Os.EOL), listOfVersions.map((version) => version.versionProperty));
    }    
    
    return success();
  }

  private getStartDate(): Date {
    if (!_.isNil(this.startDate)) {
      const timeStamp = Date.parse(this.startDate);
      if (!_.isNaN(timeStamp)) {
        return new Date(timeStamp);
      } else {
        throw failure(ErrorCodes.InvalidParameter, `start date value ${this.startDate} is not a valid date string`);
      }
    } else {
      // today 00:00 by default
      return new Date(new Date().setHours(0, 0, 0, 0));
    }
  }

  private getEndDate(): Date {
    if (!_.isNil(this.endDate)) {
      const timeStamp = Date.parse(this.endDate);
      if (!_.isNaN(timeStamp)) {
        return new Date(timeStamp);
      } else {
        throw failure(ErrorCodes.InvalidParameter, `end date value ${this.endDate} is not a valid date string`);
      }
    } else {
      // "now" by default
      return new Date();
    }
  }
}
