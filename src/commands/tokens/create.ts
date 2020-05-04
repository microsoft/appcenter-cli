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
import { allPrincipalTypes, PrincipalType, validatePrincipalType } from "../../util/misc/principal-type";

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

  @help("The type of token: [" + allPrincipalTypes.join("(default), ") + "]. An app must be specified for app type tokens")
  @shortName("t")
  @longName("type")
  @hasArg
  @defaultValue("user")
  principalType: PrincipalType;

  async run(client: AppCenterClient): Promise<CommandResult> {
    validatePrincipalType(this.principalType);
    const tokenMessaging = `Creating ${this.principalType} API token ...`;
    const tokenAttributes: models.ApiTokensCreateRequest = {
      description: this.description,
    };
    let createTokenResponse;

    if (this.principalType === PrincipalType.USER) {
      createTokenResponse = await out.progress(
        tokenMessaging,
        clientRequest<models.ApiTokensCreateResponse>((cb) => client.userApiTokens.newMethod(tokenAttributes, cb))
      );
    } else if (this.principalType === PrincipalType.APP) {
      const app: DefaultApp = this.app;
      createTokenResponse = await out.progress(
        tokenMessaging,
        clientRequest<models.ApiTokensCreateResponse>((cb) =>
          client.appApiTokens.newMethod(app.ownerName, app.appName, tokenAttributes, cb)
        )
      );
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
