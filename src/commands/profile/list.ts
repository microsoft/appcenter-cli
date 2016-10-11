// profile list command

import { Command, CommandArgs, CommandResult, success } from "../../util/commandline";
import { Profile, getUser, environments } from "../../util/profile";
import { out } from "../../util/interaction";
import { GetUserResponse, UserClient } from "../../util/apis";

export default class ProfileListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(): Promise<CommandResult> {
    const currentUser = getUser();
    if (currentUser !== null) {
      const client = new UserClient(currentUser.endpoint, currentUser.accessToken);
      const userInfo = await out.progress("Getting user information ...", client.getUser());

      out.report(
        [
          ["Username", "name" ],
          [ "Display Name", "display_name" ],
          [ "Email", "email"]
        ], userInfo);
    } else {
      out.text("Not logged in.");
    }
    return success();
  }
}