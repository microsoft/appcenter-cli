import { Command, CommandArgs, CommandResult, help, success } from "../../util/commandline";
import { out } from "../../util/interaction";
import { reportTokenInfo } from "./lib/format-token";
import { MobileCenterClient, models, clientCall } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:list");
import { inspect } from "util";

@help("Get a list of API tokens")
export default class ApiTokenListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }


  async run(client: MobileCenterClient): Promise<CommandResult> {
    const apiTokens = await out.progress("Getting API tokens ...",
      clientCall<models.ApiTokenResponse[]>(cb => client.account.getApiTokens(cb)));

    apiTokens.map(apiToken => reportTokenInfo(apiToken));

    return success();
  }
}
