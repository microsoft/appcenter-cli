import { Command, CommandArgs, CommandResult, success } from "../util/commandline";
import { AuthTokenClient } from "../util/apis";
import { getUser, deleteUser } from "../util/profile";
import { out } from "../util/interaction";

export default class LogoutCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(): Promise<CommandResult> {
    const currentUser = getUser();
    if (currentUser !== null) {
      const tokenClient = new AuthTokenClient(currentUser.endpoint, currentUser.accessToken);
      await out.progress("Removing access token ...", tokenClient.deleteToken(currentUser.accessTokenId));
      deleteUser();
    }

    return success();
  }
}
