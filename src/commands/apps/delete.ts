// apps delete command

import { AppCommand, CommandArgs, CommandResult, help, success, failure, ErrorCodes } from "../../util/commandline";
import { out, prompt } from "../../util/interaction";
import { AppCenterClient, models, clientRequest } from "../../util/apis";

@help("Delete an app")
export default class AppDeleteCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;
    const confirmation = await prompt.confirm(`Do you really want to delete the app "${app.identifier}"`);

    if (confirmation) {
      const deleteAppResponse = await out.progress("Deleting app ...", clientRequest<models.AppResponse>((cb) => client.apps.deleteMethod(app.appName, app.ownerName, cb)));

      const statusCode = deleteAppResponse.response.statusCode;
      if (statusCode >= 400) {
        switch (statusCode) {
          case 404:
            return failure(ErrorCodes.NotFound, `the app "${app.identifier}" could not be found`);
          default:
            return failure(ErrorCodes.Exception, "Unknown error when deleting the app");
        }
      }
    } else {
      out.text(`Deletion of "${app.identifier}" canceled`);
    }

    return success();
  }
}
