// token create command

import {
  CommandArgs,
  CommandResult,
  help,
  success,
  shortName,
  longName,
  hasArg,
  AppCommand,
  defaultValue,
  ErrorCodes,
  failure,
} from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportToken } from "./lib/format-token";
import { DefaultApp } from "../../util/profile";
import { AppCenterClient, models } from "../../util/apis";
import { PrincipalType, validatePrincipalType } from "../../util/misc/principal-type";

@help("Create a new API token")
export default class TokenCreateCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("Description of the API token")
  @shortName("d")
  @longName("description")
  @hasArg
  description: string;

  @help("The type of token: [ user, app ]. An app must be specified for app type tokens")
  @shortName("t")
  @longName("type")
  @hasArg
  @defaultValue("user")
  principalType: PrincipalType;

  async run(client: AppCenterClient): Promise<CommandResult> {
    validatePrincipalType(this.principalType);
    const tokenMessaging = `Creating ${this.principalType} API token ...`;

    const tokenAttributes: models.UserApiTokensCreateOptionalParams = {
      description: this.description,
      onResponse: (response, _flatResponse, _error?) => this.handleCreateTokenResponse(response.status),
    };

    let createTokenResponse;
    try {
      if (this.principalType === PrincipalType.USER) {
        createTokenResponse = await out.progress(tokenMessaging, client.userApiTokens.create(tokenAttributes));
      } else if (this.principalType === PrincipalType.APP) {
        const app: DefaultApp = this.app;
        createTokenResponse = await out.progress(
          tokenMessaging,
          client.appApiTokens.create(app.ownerName, app.appName, tokenAttributes)
        );
      }
    } catch (error) {
      return error;
    }

    reportToken(createTokenResponse);

    return success();
  }

  private handleCreateTokenResponse(statusCode: number) {
    if (statusCode >= 400) {
      switch (statusCode) {
        case 400:
        default:
          throw failure(ErrorCodes.Exception, "invalid request");
        case 403:
          throw failure(ErrorCodes.InvalidParameter, "authorization to create an API token failed");
        case 404:
          throw failure(ErrorCodes.NotLoggedIn, `${this.principalType} could not be found`);
      }
    }
  }
}
