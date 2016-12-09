// apps delete command

import { AppCommand, CommandArgs, CommandResult, help, success, failure, ErrorCodes } from "../../util/commandline";
import { out, prompt } from "../../util/interaction";
import { MobileCenterClient, models, clientCall } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:create");
import { inspect } from "util";

@help("Delete an app")
export default class AppDeleteCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;
    const confirmation = await prompt.confirm(`Do you really want to delete the app "${app.identifier}"`);

    if (confirmation) {
      const result = await out.progress("Deleting app ...", clientCall<models.AppResponse>(cb => client.account.deleteApp(app.appName, app.ownerName, cb)));

      if (result && (result as any).error.code as string === "NotFound") {
        return failure(ErrorCodes.NotFound, `the app "${app.identifier}" could not be found`);
      }
    } else {
      out.text(`Deletion of "${app.identifier}" canceled`);
    }

    return success();
  }
}
