// Implementation of profile configure command

import { Command, CommandArgs, CommandResult, help, success } from "../../util/commandline";
import { prompt, out } from "../../util/interaction";
import { Profile } from "../../util/profile";
import { AppCenterClient, models, clientCall } from "../../util/apis";
import { reportProfile } from "./lib/format-profile";

@help("Update user information")
export default class ProfileConfigureCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const profile = await out.progress("Getting current user profile...",
      clientCall<Profile>((cb) => client.users.get(cb)));

    const questions: any[] = [
      {
        type: "input",
        name: "displayName",
        message: "Display name",
        default: profile.displayName
      }
    ];

    const answers: any = await prompt.question(questions);
    const anyChanged = Object.keys(answers).some((k) => answers[k] !== (profile as any)[k]);

    if (anyChanged) {
      const updated = await out.progress("Updating user profile...",
        clientCall<models.UserProfileResponse>((cb) => client.users.update({ displayName: answers.displayName }, cb))
      );

      reportProfile(updated);
    } else {
      out.text("No changes to profile");
    }
    return success();
  }
}
