// tokens delete command

import { CommandArgs, CommandResult, help, success, failure, ErrorCodes, position, required, name, AppCommand, shortName, longName, hasArg } from "../../util/commandline";
import { out, prompt } from "../../util/interaction";
import { AppCenterClient, clientRequest } from "../../util/apis";
import { DefaultApp } from "../../util/profile";
import { allPrincipalTypes, PrincipalType, principalMessaging } from "../../util/misc/principal-type";

@help("Delete an API token")
export default class AppDeleteCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("ID of the API token")
  @name("token")
  @required
  @position(0)
  id: string;

  @help("The type of token principal authentication: [" + allPrincipalTypes.join(", ") + "]")
  @shortName("t")
  @longName("type")
  @hasArg
  public principalType: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;
    const tokenMessaging = this.principalType === PrincipalType.USER ? principalMessaging.user : principalMessaging.app;
    const confirmation = await prompt.confirm(`Do you really want to delete the ${tokenMessaging}  token with ID "${this.id}"`);

    if (confirmation) {
      const deleteTokenResponse = await out.progress(`Deleting ${tokenMessaging} token ...`, clientRequest<null>((cb) => client.apiTokens.deleteMethod(this.id, cb)));
      if (deleteTokenResponse.response.statusCode === 404) {
        return failure(ErrorCodes.InvalidParameter, `the ${tokenMessaging} token with ID "${this.id}" could not be found`);
      }
    } else {
      out.text(`Deletion of token with ID "${this.id}" canceled`);
    }

    return success();
  }
}
