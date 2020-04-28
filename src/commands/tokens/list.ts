import {
  CommandArgs,
  CommandResult,
  help,
  success,
  AppCommand,
  shortName,
  longName,
  hasArg,
  failure,
  ErrorCodes,
  defaultValue,
} from "../../util/commandline";
import { out } from "../../util/interaction";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { DefaultApp } from "../../util/profile";
import { allPrincipalTypes, PrincipalType, principalMessaging } from "../../util/misc/principal-type";

@help("Get a list of API tokens")
export default class ApiTokenListCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("The type of token principal authentication: [" + allPrincipalTypes.join(", ") + "]")
  @shortName("t")
  @longName("type")
  @hasArg
  @defaultValue("user")
  public principalType: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    const tokenLevel = this.principalType === PrincipalType.USER ? principalMessaging.user : principalMessaging.app;
    const tokenMessaging = `Getting ${tokenLevel} API tokens ...`;

    let listTokensResponse;
    if (this.principalType === PrincipalType.USER) {
      listTokensResponse = await out.progress(
        tokenMessaging,
        clientRequest<models.ApiTokensGetResponse[]>((cb) => client.apiTokens.list(cb))
      );
    } else if (this.principalType === PrincipalType.APP) {
      const app: DefaultApp = this.app;
      listTokensResponse = await out.progress(
        tokenMessaging,
        clientRequest<models.ApiTokensGetResponse[]>((cb) => client.appApiTokens.list(app.ownerName, app.appName, cb))
      );
    } else {
      return failure(ErrorCodes.InvalidParameter, "Provided token type is invalid. Should be: [" + allPrincipalTypes.join(", ") + "]");
    }

    out.table(
      out.getCommandOutputTableOptions(["ID", "Description", "Type", "Created At"]),
      listTokensResponse.result.map((apiToken) => [apiToken.id, apiToken.description, this.principalType, apiToken.createdAt])
    );

    return success();
  }
}
