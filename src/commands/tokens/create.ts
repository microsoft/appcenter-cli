// token create command

import {
  CommandArgs,
  CommandResult,
  help,
  success,
  failure,
  ErrorCodes,
  shortName,
  longName,
  hasArg,
  AppCommand,
  defaultValue,
} from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportToken } from "./lib/format-token";
import { DefaultApp } from "../../util/profile";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { allPrincipalTypes, principalMessaging, PrincipalType } from "../../util/misc/principal-type";

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

  @help("The type of token principal authentication: [" + allPrincipalTypes.join(", ") + "]")
  @shortName("t")
  @longName("type")
  @hasArg
  @defaultValue("user")
  public principalType: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    const tokenLevel = this.principalType === PrincipalType.USER ? principalMessaging.user : principalMessaging.app;
    const tokenMessaging = `Creating ${tokenLevel} API token ...`;
    const tokenAttributes: models.ApiTokensCreateRequest = {
      description: this.description,
    };
    let createTokenResponse;

    if (this.principalType === PrincipalType.USER) {
      createTokenResponse = await out.progress(
        tokenMessaging,
        clientRequest<models.ApiTokensCreateResponse>((cb) => client.apiTokens.newMethod(tokenAttributes, cb))
      );
    } else if (this.principalType === PrincipalType.APP) {
      const app: DefaultApp = this.app;
      createTokenResponse = await out.progress(
        tokenMessaging,
        clientRequest<models.ApiTokensCreateResponse>((cb) =>
          client.appApiTokens.newMethod(app.ownerName, app.appName, tokenAttributes, cb)
        )
      );
    } else {
      return failure(ErrorCodes.InvalidParameter, "Provided token type is invalid. Should be: [" + allPrincipalTypes.join(", ") + "]");
    }

    const statusCode = createTokenResponse.response.statusCode;
    if (statusCode >= 400) {
      switch (statusCode) {
        case 400:
        default:
          return failure(ErrorCodes.Exception, "invalid request");
        case 403:
          return failure(ErrorCodes.InvalidParameter, "authorization to create an API token failed");
        case 404:
          return failure(ErrorCodes.NotLoggedIn, `${this.principalType === PrincipalType.USER ? "user" : "app"} could not be found`);
      }
    }

    reportToken(createTokenResponse.result);

    return success();
  }
}
