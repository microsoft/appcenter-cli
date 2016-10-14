import { Command, CommandArgs, CommandResult, success } from "../util/commandline";
import { SonomaClient, models } from "../util/apis";
import { getUser, deleteUser } from "../util/profile";
import { out } from "../util/interaction";

export default class LogoutCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    const currentUser = getUser();
    await out.progress("Removing access token ...",
     new Promise((resolve, reject) => {
      client.account.deleteApiToken(currentUser.accessTokenId, (err) => {
        if (err) { reject(err); }
        else { resolve(); }
      });
    }));
    deleteUser();
    return success();
  }
}
