// token create command

import { CommandArgs, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, AppCommand, defaultValue } from "../../util/commandline";
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
    const app: DefaultApp = this.app;
    const tokenMessaging = this.principalType === PrincipalType.USER ? principalMessaging.user : principalMessaging.app;
    const tokenAttributes: models.ApiTokensCreateRequest = {
      description: this.description,
    };

    const createTokenResponse = await out.progress(`Creating ${tokenMessaging} token ...`,
      clientRequest<models.ApiTokensCreateResponse>((cb) => client.apiTokens.newMethod(tokenAttributes, cb))
    );

    const statusCode = createTokenResponse.response.statusCode;
    if (statusCode >= 400) {
      switch (statusCode) {
        case 400:
        default:
          return failure(ErrorCodes.Exception, "invalid request");
        case 403:
          return failure(ErrorCodes.InvalidParameter, "authorization to create an API token failed");
        case 404:
          return failure(ErrorCodes.NotLoggedIn, "user could not be found");
      }
    }

    reportToken(createTokenResponse.result);

    return success();
  }
}
