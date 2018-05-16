// token create command

import { Command, CommandArgs, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg } from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportToken } from "./lib/format-token";
import { AppCenterClient, models, clientRequest } from "../../util/apis";

@help("Create a new API token")
export default class TokenCreateCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("Description of the API token")
  @shortName("d")
  @longName("description")
  @hasArg
  description: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    const tokenAttributes: models.ApiTokensCreateRequest = {
      description: this.description,
    };

    const createTokenResponse = await out.progress("Creating token ...",
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
