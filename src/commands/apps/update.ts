// apps create command

import { AppCommand, CommandArgs, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg } from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportApp } from "./lib/format-app";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { APP_RELEASE_TYPE_VALIDATIONS } from "./lib/app-release-type-validation";

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

  @help("The app release type. Suggested values are Alpha, Beta, Production, Store, Enterprise. Custom values are allowed and must be must be one word, alphanumeric, first letter capitalized.")
  @shortName("r")
  @longName("release-type")
  @hasArg
  release_type: string;

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

    if (this.release_type) {
      if (this.release_type.length > APP_RELEASE_TYPE_VALIDATIONS.maxLength.rule) {
        return failure(ErrorCodes.InvalidParameter, APP_RELEASE_TYPE_VALIDATIONS.maxLength.errorMessage);
      }
      if (!APP_RELEASE_TYPE_VALIDATIONS.matchRegexp.rule.test(this.release_type)) {
        return failure(ErrorCodes.InvalidParameter, APP_RELEASE_TYPE_VALIDATIONS.matchRegexp.errorMessage);
      }
      appAttributes.releaseType = this.release_type;
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
