// apps create command

import { AppCommand, CommandArgs, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportApp } from "./lib/format-app";
import { AppCenterClient, models, clientRequest } from "../../util/apis";

const debug = require("debug")("appcenter-cli:commands:apps:create");
import { inspect } from "util";

@help("Update an app")
export default class AppUpdateCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("Description of the app")
  @longName("description")
  @hasArg
  description: string;

  @help("The descriptive name of the app. This can contain any characters.")
  @shortName("d")
  @longName("display-name")
  @hasArg
  displayName: string;

  @help("The name of the app used in URLs.")
  @shortName("n")
  @longName("name")
  @hasArg
  name: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    const appAttributes: models.AppPatchRequest = {};

    if (this.description) {
      appAttributes.description = this.description;
    }

    if (this.displayName) {
      appAttributes.displayName = this.displayName;
    }

    if (this.name) {
      appAttributes.name = this.name;
    }

    const app = this.app;
    const updateAppResponse = await out.progress("Updating app ...",
      clientRequest<models.AppResponse>(cb => client.account.apps.update(app.appName, app.ownerName, { app: appAttributes }, cb))
    );

    const statusCode = updateAppResponse.response.statusCode;
    if (statusCode >= 400) {
      switch (statusCode) {
        case 400:
          return failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
        case 404:
          return failure(ErrorCodes.NotLoggedIn, `the app "${app.identifier}" could not be found`);
        case 409:
          return failure(ErrorCodes.InvalidParameter, `an app with the "name" ${app.appName} already exists`);
      }
    }

    reportApp(updateAppResponse.result);

    return success();
  }
}
