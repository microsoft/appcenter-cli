import { CommandArgs, CommandResult, help, success, AppCommand, shortName, longName, hasArg } from "../../util/commandline";
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
  public principalType: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;
    const tokenMessaging = this.principalType === PrincipalType.USER ? principalMessaging.user : principalMessaging.app;
    const apiTokensResponse = await out.progress(`Getting ${tokenMessaging} API tokens ...`,
      clientRequest<models.ApiTokensGetResponse[]>((cb) => client.apiTokens.list(cb)));

    out.table(out.getCommandOutputTableOptions(["ID", "Description", "Type", "Created At"]),
      apiTokensResponse.result.map((apiToken) => [apiToken.id, apiToken.description, this.principalType, apiToken.createdAt])
    );

    return success();
  }
}
