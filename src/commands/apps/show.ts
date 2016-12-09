// apps show command

import { AppCommand, CommandArgs, CommandResult, help, success, failure, ErrorCodes } from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportApp } from "./lib/format-app";
import { MobileCenterClient, models, clientCall } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:show");
import { inspect } from "util";

@help("Get the details of an app")
export default class AppShowCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    const appDetails = await out.progress("Getting app details ...", clientCall<models.AppResponse>(cb => client.account.getApp(app.appName, app.ownerName, cb)));

    switch ((appDetails as any).error.code as string) {
      case "BadRequest":
        return failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
      case "NotFound":
        return failure(ErrorCodes.NotFound, `the app "${app.identifier}" could not be found`);
    }

    reportApp(appDetails);

    return success();
  }
}
