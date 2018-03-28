// apps show command

import { AppCommand, CommandArgs, CommandResult, help, success, failure, ErrorCodes } from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportApp } from "./lib/format-app";
import { AppCenterClient, models, clientRequest } from "../../util/apis";

@help("Get the details of an app")
export default class AppShowCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    const appDetailsResponse = await out.progress("Getting app details ...", clientRequest<models.AppResponse>((cb) => client.apps.get(app.ownerName, app.appName, cb)));

    const statusCode = appDetailsResponse.response.statusCode;

    if (statusCode >= 400) {
      switch (statusCode) {
        case 400:
          return failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
        case 404:
          return failure(ErrorCodes.NotFound, `the app "${app.identifier}" could not be found`);
        default:
          return failure(ErrorCodes.Exception, "Unknown error when loading apps");
      }
    }

    reportApp(appDetailsResponse.result);

    return success();
  }
}
