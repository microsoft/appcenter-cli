import {
  CommandArgs,
  CommandResult,
  help,
  success,
  AppCommand,
  shortName,
  longName,
  hasArg,
  defaultValue,
  failure,
  ErrorCodes,
} from "../../util/commandline";
import { out } from "../../util/interaction";
import { AppCenterClient } from "../../util/apis";
import { DefaultApp } from "../../util/profile";
import { PrincipalType, validatePrincipalType } from "../../util/misc/principal-type";

@help("Get a list of API tokens")
export default class ApiTokenListCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("The type of token: [ user, app ]. An app must be specified for app type tokens")
  @shortName("t")
  @longName("type")
  @hasArg
  @defaultValue("user")
  principalType: PrincipalType;

  async run(client: AppCenterClient): Promise<CommandResult> {
    validatePrincipalType(this.principalType);
    const tokenMessaging = `Getting ${this.principalType} API tokens ...`;

    let listTokensResponse;

    try {
      if (this.principalType === PrincipalType.USER) {
        listTokensResponse = await out.progress(tokenMessaging, client.userApiTokens.list());
      } else if (this.principalType === PrincipalType.APP) {
        const app: DefaultApp = this.app;
        listTokensResponse = await out.progress(tokenMessaging, client.appApiTokens.list(app.ownerName, app.appName));
      }
    } catch (error) {
      const statusCode = error.response.statusCode;
      if (statusCode >= 400) {
        switch (statusCode) {
          case 400:
          default:
            return failure(ErrorCodes.Exception, "invalid request");
          case 401:
            return failure(ErrorCodes.InvalidParameter, "authorization to create an API token failed");
          case 404:
            return failure(ErrorCodes.NotLoggedIn, `${this.principalType} could not be found`);
        }
      }
    }

    out.table(
      out.getCommandOutputTableOptions(["ID", "Description", "Type", "Created At"]),
      listTokensResponse.map((apiToken) => [apiToken.id, apiToken.description, this.principalType, apiToken.createdAt])
    );

    return success();
  }
}
