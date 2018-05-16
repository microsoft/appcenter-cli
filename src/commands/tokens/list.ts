import { Command, CommandArgs, CommandResult, help, success } from "../../util/commandline";
import { out } from "../../util/interaction";
import { AppCenterClient, models, clientRequest } from "../../util/apis";

@help("Get a list of API tokens")
export default class ApiTokenListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const apiTokensResponse = await out.progress("Getting API tokens ...",
      clientRequest<models.ApiTokensGetResponse[]>((cb) => client.apiTokens.list(cb)));

    out.table(out.getCommandOutputTableOptions(["ID", "Description", "Created At"]),
      apiTokensResponse.result.map((apiToken) => [apiToken.id, apiToken.description, apiToken.createdAt])
    );

    return success();
  }
}
