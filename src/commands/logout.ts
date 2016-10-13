import { Command, CommandArgs, CommandResult, success } from "../util/commandline";
import { SonomaClient, models, SonomaClientCredentials } from "../util/apis";
import { getUser, deleteUser } from "../util/profile";
import { out } from "../util/interaction";

export default class LogoutCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(): Promise<CommandResult> {
    const currentUser = getUser();
    if (currentUser !== null) {
      const client = new SonomaClient(new SonomaClientCredentials(currentUser.accessToken), currentUser.endpoint, {});
      await out.progress("Removing access token ...", new Promise((resolve, reject) => {
        client.account.deleteApiToken(currentUser.accessTokenId, (err) => {
          if (err) { reject(err); }
          else { resolve(); }
        });
      }));
      deleteUser();
    }

    return success();
  }
}
