// apps create command

import { AppCommand, CommandArgs, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg } from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportApp } from "./lib/format-app";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { APP_ENVIRONMENT_VALIDATIONS } from "./lib/app-environment-validation";

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

  @help("The environment of the app. This must be one word, alphanumeric, first letter capitalized.")
  @shortName("e")
  @longName("environment-app")
  @hasArg
  environment: string;

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

    if (this.environment) {
      if (this.environment.length > APP_ENVIRONMENT_VALIDATIONS.maxLength.rule) {
        return failure(ErrorCodes.InvalidParameter, APP_ENVIRONMENT_VALIDATIONS.maxLength.errorMessage);
      }
      if (!APP_ENVIRONMENT_VALIDATIONS.matchRegexp.rule.test(this.environment)) {
        return failure(ErrorCodes.InvalidParameter, APP_ENVIRONMENT_VALIDATIONS.matchRegexp.errorMessage);
      }
      appAttributes.environment = this.environment;
    }

    const app = this.app;
    const updateAppResponse = await out.progress("Updating app ...",
      clientRequest<models.AppResponse>((cb) => client.apps.update(app.appName, app.ownerName, { app: appAttributes }, cb))
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
