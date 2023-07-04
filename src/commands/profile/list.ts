// profile list command

import { Command, CommandArgs, CommandResult, ErrorCodes, failure, help, success } from "../../util/commandline";
import { AppCenterClient } from "../../util/apis";
import { reportProfile } from "./lib/format-profile";
import { out } from "../../util/interaction";

@help("Get information about logged in user")
export default class ProfileListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    let commandResult : CommandResult;

    const userInfo = await out.progress(
      "Getting user information...",
      client.users.get({onResponse : (rawResponse, _flatResponse, _error?) =>
        {
          if (rawResponse.status >= 400) {
            switch (rawResponse.status) {
              case 400:
                commandResult = failure(ErrorCodes.Exception, "the request was rejected for an unknown reason");
              case 404:
                commandResult = failure(ErrorCodes.NotFound, `the user could not be found`);
              default:
                commandResult = failure(ErrorCodes.Exception, "Unknown error when loading apps");
            }
          }
        }})
    );

    if (commandResult) {
      return commandResult;
    }

    reportProfile(userInfo);
    return success();
  }
}
