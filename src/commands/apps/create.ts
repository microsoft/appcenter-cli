// apps create command

import { AppCommand, CommandArgs, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportApp } from "./lib/format-app";
import { MobileCenterClient, models, clientCall } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:create");
import { inspect } from "util";

@help("Create a new app")
export default class AppCreateCommand extends AppCommand {
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

  @help("The OS the app will be running on")
  @shortName("o")
  @longName("os")
  @required
  @hasArg
  os: string;

  @help("The platform of the app")
  @shortName("p")
  @longName("platform")
  @required
  @hasArg
  platform: string;

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const appAttributes: models.AppRequest = {
      displayName: this.displayName,
      platform: this.platform,
      os: this.os,
      description: this.description,
      name: this.name,
    };

    const createdApp = await out.progress("Creating app ...",
      clientCall<models.AppResponse>(cb => client.account.createApp(appAttributes, cb))
    );

    if ((createdApp as any).error) {
      switch ((createdApp as any).error.code as string || "") {
        case "BadRequest":
          return failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
        case "NotFound":
          return failure(ErrorCodes.NotLoggedIn, "there appears to be no such user");
        case "Conflict":
          return failure(ErrorCodes.InvalidParameter, "an app with this 'name' already exists");
      }
    } else if (!createdApp.id) {
      return failure(ErrorCodes.Exception, "invalid request");
    }

    reportApp(createdApp);

    return success();
  }
}
