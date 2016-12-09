// tokens delete command

import { Command, CommandArgs, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../util/commandline";
import { out, prompt } from "../../util/interaction";
import { MobileCenterClient, models, clientCall } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:create");
import { inspect } from "util";

@help("Delete an API token")
export default class AppDeleteCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("ID of the API token")
  @required
  @hasArg
  id: string;

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const confirmation = await prompt.confirm(`Do you really want to delete the token with ID "${this.id}"`);

    if (confirmation) {
      const result = await out.progress("Deleting app ...", clientCall<null>(cb => client.account.deleteApiToken(this.id, cb)));

      if (result && (result as any).error.code as string === "NotFound") {
        return failure(ErrorCodes.InvalidParameter, `the token with ID "${this.id}" could not be found`);
      }
    } else {
      out.text(`Deletion of token with ID "${this.id}" canceled`);
    }

    return success();
  }
}
