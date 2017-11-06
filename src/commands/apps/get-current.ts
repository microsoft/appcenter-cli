import { Command, CommandArgs, CommandResult, success, failure, name, help, position, required, ErrorCodes } from "../../util/commandline";
import { MobileCenterClient, models, clientCall } from "../../util/apis";
import { out, formatIsJson } from "../../util/interaction";
import { Profile, DefaultApp, getUser } from "../../util/profile";

@help("Get the application that's set as default for all CLI commands")
export default class GetCurrentAppCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async runNoClient(): Promise<CommandResult> {
    const user = getUser();
    out.text((defaultApp) => defaultApp ? `${user.defaultApp.ownerName}/${user.defaultApp.appName}` : "No app is currently set as default, use 'mobile-center apps set-current' command", user && user.defaultApp);
    return success();
  }
}
