// Implementation of profile configure command

import { Command, CommandResult, success, failure, ErrorCodes } from "../../util/commandline";
import { prompt, out } from "../../util/interaction";
import { getUser } from "../../util/profile";
import { UserClient } from "../../util/apis/users";

export default class ProfileConfigureCommand extends Command {
  constructor(command: string[]) {
    super(command);
  }

  async run(): Promise<CommandResult> {
    const currentUser = getUser();
    if (!currentUser) {
      out.text(`Not logged in, use 'sonoma login' command to log in.`);
      return failure(ErrorCodes.NotLoggedIn, "No logged in user");
    }

    const userClient = new UserClient(currentUser.endpoint, currentUser.accessToken);
    let profile = await out.progress("Getting current user profile...", userClient.getUser());

    const questions: any[] = [
      {
        type: "input",
        name: "display_name",
        message: "Display name",
        default: profile.display_name
      }
    ];

    const answers = await prompt.question(questions);
    const anyChanged = Object.keys(answers).some(k => answers[k] !== (<any>profile)[k]);

    if (anyChanged) {
      const updated = await out.progress("Updating user profile...", userClient.updateUser(answers));
      out.report(
        [
          ["Username", "name" ],
          [ "Display Name", "display_name" ],
          [ "Email", "email"]
        ], updated);
    } else {
      out.text("No changes to profile");
    }
    return success();
  }
}