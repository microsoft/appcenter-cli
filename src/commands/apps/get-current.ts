import { Command, CommandArgs, CommandResult, success, help } from "../../util/commandline";
import { out } from "../../util/interaction";
import { getUser } from "../../util/profile";

@help("Get the application that's set as default for all CLI commands")
export default class GetCurrentAppCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async runNoClient(): Promise<CommandResult> {
    const user = getUser();
    const currentApp = user.defaultApp ? `${user.defaultApp.ownerName}/${user.defaultApp.appName}` : "";
    out.text((s) => s, currentApp);
    return success();
  }
}
