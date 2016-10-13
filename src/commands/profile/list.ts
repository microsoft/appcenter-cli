// profile list command

import { Command, CommandArgs, CommandResult, help, success, notLoggedIn } from "../../util/commandline";
import { Profile, getUser, environments } from "../../util/profile";
import { out } from "../../util/interaction";
import { createSonomaClient } from "../../util/apis";

@help("Get information about logged in user")
export default class ProfileListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(): Promise<CommandResult> {
    const client = createSonomaClient(getUser());
    if (client) {
      const userInfo = await out.progress("Getting user information...",
        new Promise((resolve, reject) => {
          client.account.getUserProfile((err, result) => {
            if (err) { reject(err); }
            else { resolve(result); }
          });
        }));
      out.report(
        [
          ["Username", "name" ],
          [ "Display Name", "displayName" ],
          [ "Email", "email"]
        ], userInfo);
    } else {
      out.text("Not logged in.");
      return notLoggedIn("profile list");
    }
    return success();
  }
}