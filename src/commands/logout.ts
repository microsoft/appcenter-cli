import { Command, CommandArgs, CommandResult, help, success } from "../util/commandline";
import { AppCenterClient } from "../util/apis";
import { getUser } from "../util/profile";
import { logout } from "./lib/logout";
import { out } from "../util/interaction";

@help("Log out")
export default class LogoutCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    await logout(client, getUser());
    out.text("Successfully logged out");
    // Force early exit to avoid long standing delays if token deletion is slow
    process.exit(0);
    return success(); // unreachable code, but it is required to keep TS compiler happy
  }
}
