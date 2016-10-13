// Implementation of profile configure command

import { Command, CommandArgs, CommandResult, help, success, failure, ErrorCodes } from "../../util/commandline";
import { prompt, out } from "../../util/interaction";
import { getUser } from "../../util/profile";
import { createSonomaClient, models } from "../../util/apis";

@help("Update user information")
export default class ProfileConfigureCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(): Promise<CommandResult> {
    const currentUser = getUser();
    if (!currentUser) {
      out.text(`Not logged in, use 'sonoma login' command to log in.`);
      return failure(ErrorCodes.NotLoggedIn, "No logged in user");
    }

    const client = createSonomaClient(currentUser);
    let profile = await out.progress("Getting current user profile...",
      new Promise<models.UserProfileResponse>((resolve, reject) => {
        client.account.getUserProfile((err, result) => {
          if (err) { reject(err); }
          else { resolve(result); }
        });
      }));

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
        new Promise<models.UserProfileResponse>((resolve, reject) => {
          client.account.updateUserProfile({ displayName: answers.displayName }, (err, result) => {
            if (err) { reject(err); }
            else { resolve(result); }
          });
        }));

      out.report(
        [
          ["Username", "name" ],
          [ "Display Name", "displayName" ],
          [ "Email", "email"]
        ], updated);
    } else {
      out.text("No changes to profile");
    }
    return success();
  }
}