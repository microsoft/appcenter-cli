import { Command, CommandArgs, CommandResult, help, success } from "../util/commandline";
import { MobileCenterClient } from "../util/apis";
import { getUser } from "../util/profile";
import { logout } from "./lib/logout";

@help("Log the CLI out of Mobile Center")
export default class LogoutCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    await logout(client, getUser());
    return success();
  }
}
