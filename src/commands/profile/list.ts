// profile list command

import { Command, CommandArgs, CommandResult, help, success, notLoggedIn } from "../../util/commandline";
import { Profile, getUser, environments } from "../../util/profile";
import { out } from "../../util/interaction";
import { SonomaClient, clientCall } from "../../util/apis";

@help("Get information about logged in user")
export default class ProfileListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    const userInfo = await out.progress("Getting user information...",
      clientCall(cb => client.account.getUserProfile(cb)));

    out.report(
      [
        ["Username", "name" ],
        [ "Display Name", "displayName" ],
        [ "Email", "email"]
      ], userInfo);

    return success();
  }
}
