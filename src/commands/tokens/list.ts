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
import { AppCenterClient, models, clientRequest } from "../../util/apis";
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
    if (this.principalType === PrincipalType.USER) {
      listTokensResponse = await out.progress(
        tokenMessaging,
        clientRequest<models.ApiTokensGetResponse[]>((cb) => client.userApiTokens.list(cb))
      );
    } else if (this.principalType === PrincipalType.APP) {
      const app: DefaultApp = this.app;
      listTokensResponse = await out.progress(
        tokenMessaging,
        clientRequest<models.ApiTokensGetResponse[]>((cb) => client.appApiTokens.list(app.ownerName, app.appName, cb))
      );
    }
    const statusCode = listTokensResponse.response.statusCode;
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

    out.table(
      out.getCommandOutputTableOptions(["ID", "Description", "Type", "Created At"]),
      listTokensResponse.result.map((apiToken) => [apiToken.id, apiToken.description, this.principalType, apiToken.createdAt])
    );

    return success();
  }
}
