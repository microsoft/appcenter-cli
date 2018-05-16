// tokens delete command

import { Command, CommandArgs, CommandResult, help, success, failure, ErrorCodes, position, required, name } from "../../util/commandline";
import { out, prompt } from "../../util/interaction";
import { AppCenterClient, clientRequest } from "../../util/apis";

@help("Delete an API token")
export default class AppDeleteCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("ID of the API token")
  @name("token")
  @required
  @position(0)
  id: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    const confirmation = await prompt.confirm(`Do you really want to delete the token with ID "${this.id}"`);

    if (confirmation) {
      const deleteTokenResponse = await out.progress("Deleting token ...", clientRequest<null>((cb) => client.apiTokens.deleteMethod(this.id, cb)));

      if (deleteTokenResponse.response.statusCode === 404) {
        return failure(ErrorCodes.InvalidParameter, `the token with ID "${this.id}" could not be found`);
      }
    } else {
      out.text(`Deletion of token with ID "${this.id}" canceled`);
    }

    return success();
  }
}
