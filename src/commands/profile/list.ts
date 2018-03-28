// profile list command

import { Command, CommandArgs, CommandResult, help, success } from "../../util/commandline";
import { out } from "../../util/interaction";
import { AppCenterClient, models, clientCall } from "../../util/apis";
import { reportProfile } from "./lib/format-profile";

@help("Get information about logged in user")
export default class ProfileListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const userInfo = await out.progress("Getting user information...",
      clientCall<models.UserProfileResponse>((cb) => client.users.get(cb)));

    reportProfile(userInfo);
    return success();
  }
}
