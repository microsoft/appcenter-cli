// profile list command

import { Command, CommandResult, success } from "../../util/commandline";
import { Profile, getUser } from "../../util/profile";
import { out } from "../../util/interaction";

export default class ProfileListCommand extends Command {
  constructor(command: string[]) {
    super(command);
  }

  async run(): Promise<CommandResult> {
    const user = getUser();
    out.report([
      ["Username", "userName" ],
      [ "Display Name", "displayName" ],
      [ "Email", "email"]
    ], "No logged in user. Use 'sonoma login' command to log in.",
    user);

    return success();
  }
}