import { AppCommand, CommandResult, ErrorCodes, failure, hasArg, help, longName, shortName, required, success } from "../../../util/commandline";
import { AppCenterClient, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import { DefaultApp } from "../../../util/profile";

const debug = require("debug")("appcenter-cli:commands:analytics:events:delete");

@help("Delete event")
export default class DeleteCommand extends AppCommand {
  @help("Name of event to delete")
  @shortName("n")
  @longName("event-name")
  @hasArg
  @required
  public eventName: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    try {
      await out.progress("Deleting event...", clientRequest((cb) => client.analytics.eventsDelete(this.eventName, app.ownerName, app.appName, cb)));
    } catch (error) {
      debug(`Failed to delete event ${this.eventName} - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `failed to delete event ${this.eventName}`);
    }

    out.text(`Successfully deleted ${this.eventName} for this app`);

    return success();
  }

}
