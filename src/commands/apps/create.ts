// apps create command

import { Command, CommandArgs, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportApp } from "./lib/format-app";
import { AppCenterClient, models, clientRequest } from "../../util/apis";

const debug = require("debug")("appcenter-cli:commands:apps:create");
import { inspect } from "util";

@help("Create a new app")
export default class AppCreateCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("Description of the app")
  @longName("description")
  @hasArg
  description: string;

  @help("The descriptive name of the app. This can contain any characters")
  @shortName("d")
  @longName("display-name")
  @required
  @hasArg
  displayName: string;

  @help("The name of the app used in URLs. Can optionally be provided specifically, otherwise a generated name will be derived from display-name")
  @shortName("n")
  @longName("name")
  @hasArg
  name: string;

  @help("The OS the app will be running on. Supported values: Android, iOS, Windows")
  @shortName("o")
  @longName("os")
  @required
  @hasArg
  os: string;

  @help("The platform of the app. Supported values: Java, Objective-C-Swift, React-Native, UWP, Xamarin")
  @shortName("p")
  @longName("platform")
  @required
  @hasArg
  platform: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    const appAttributes: models.AppRequest = {
      displayName: this.displayName,
      platform: this.platform,
      os: this.os,
      description: this.description,
      name: this.name,
    };

    debug(`Creating app with attributes: ${inspect(appAttributes)}`);
    const createAppResponse = await out.progress("Creating app ...",
      clientRequest<models.AppResponse>(cb => client.account.apps.create(appAttributes, cb))
    );
    const statusCode = createAppResponse.response.statusCode;
    if (statusCode >= 400) {
      switch (statusCode) {
        case 400:
          return failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
        case 404:
          return failure(ErrorCodes.NotFound, "there appears to be no such user");
        case 409:
          return failure(ErrorCodes.InvalidParameter, "an app with this 'name' already exists");
      }
    }

    reportApp(createAppResponse.result);

    return success();
  }
}
