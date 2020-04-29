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
} from "../../util/commandline";
import { out } from "../../util/interaction";
import { AppCenterClient, models, clientRequest } from "../../util/apis";
import { DefaultApp } from "../../util/profile";
import { allPrincipalTypes, PrincipalType, validatePrincipalType } from "../../util/misc/principal-type";

@help("Get a list of API tokens")
export default class ApiTokenListCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("The type of token: [" + allPrincipalTypes.join(", ") + "]")
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
        clientRequest<models.ApiTokensGetResponse[]>((cb) => client.apiTokens.list(cb))
      );
    } else if (this.principalType === PrincipalType.APP) {
      const app: DefaultApp = this.app;
      listTokensResponse = await out.progress(
        tokenMessaging,
        clientRequest<models.ApiTokensGetResponse[]>((cb) => client.appApiTokens.list(app.ownerName, app.appName, cb))
      );
    }

    out.table(
      out.getCommandOutputTableOptions(["ID", "Description", "Type", "Created At"]),
      listTokensResponse.result.map((apiToken) => [apiToken.id, apiToken.description, this.principalType, apiToken.createdAt])
    );

    return success();
  }
}
