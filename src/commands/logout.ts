import { Command, CommandArgs, CommandResult, help, success } from "../util/commandline";
import { SonomaClient } from "../util/apis";
import { getUser } from "../util/profile";
import { logout } from "./lib/logout";

@help("Logout from Mobile Center")
export default class LogoutCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    await logout(client, getUser());
    return success();
  }
}
