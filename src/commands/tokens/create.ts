// token create command

import { Command, CommandArgs, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportToken } from "./lib/format-token";
import { MobileCenterClient, models, clientCall } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:create");
import { inspect } from "util";

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

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const tokenAttributes: models.ApiTokensCreateRequest = {
      description: this.description,
    };

    const createdToken = await out.progress("Creating token ...",
      clientCall<models.ApiTokensCreateResponse>(cb => client.account.createApiToken(tokenAttributes, cb))
    );

    if ((createdToken as any).error) {
      switch ((createdToken as any).error.code as string || "") {
        case "BadRequest":
          return failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
        case "NotFound":
          return failure(ErrorCodes.NotLoggedIn, "user could not be found");
        case "Forbidden":
          return failure(ErrorCodes.InvalidParameter, "authorization to create an API token failed");
      }
    } else if (!createdToken.id) {
      return failure(ErrorCodes.Exception, "invalid request");
    }

    reportToken(createdToken);

    return success();
  }
}
