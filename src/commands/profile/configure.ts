// Implementation of profile configure command

import { Command, CommandArgs, CommandResult, help, success, failure, ErrorCodes } from "../../util/commandline";
import { prompt, out } from "../../util/interaction";
import { Profile, getUser } from "../../util/profile";
import { MobileCenterClient, models, clientCall } from "../../util/apis";
import { reportProfile } from "./lib/format-profile";

@help("Update user information")
export default class ProfileConfigureCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    let profile = await out.progress("Getting current user profile...",
      clientCall<Profile>(cb => client.account.getUserProfile(cb)));

    const questions: any[] = [
      {
        type: "input",
        name: "displayName",
        message: "Display name",
        default: profile.displayName
      }
    ];

    const answers: any = await prompt.question(questions);
    const anyChanged = Object.keys(answers).some(k => answers[k] !== (<any>profile)[k]);

    if (anyChanged) {
      const updated = await out.progress("Updating user profile...",
        clientCall<models.UserProfileResponse>(cb => client.account.updateUserProfile({ displayName: answers.displayName }, cb))
      );

      reportProfile(updated);
    } else {
      out.text("No changes to profile");
    }
    return success();
  }
}