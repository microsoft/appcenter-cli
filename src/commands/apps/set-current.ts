import { Command, CommandArgs, CommandResult, success, failure, name, help, position, required, ErrorCodes } from "../../util/commandline";
import { AppCenterClient, models, clientCall } from "../../util/apis";
import { out } from "../../util/interaction";
import { Profile, DefaultApp, toDefaultApp, getUser } from "../../util/profile";

@help("Set default application for all CLI commands")
export default class SetCurrentAppCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @name("app")
  @position(0)
  @help("owner/app to set as default")
  @required
  appId: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    let newDefault = toDefaultApp(this.appId);
    if (!newDefault) {
      return failure(ErrorCodes.InvalidParameter, `'${this.appId}' is not a valid application.`);
    }

    let apps = await out.progress("Reading available apps...",
      clientCall<models.AppResponse[]>(cb => client.account.apps.list(cb)));

    let found = apps.find(app => app.name === newDefault.appName && app.owner.name === newDefault.ownerName);
    if (!found) {
      return failure(ErrorCodes.InvalidParameter, `You either do not have access to '${this.appId}' or there is no such application.`);
    }

    let profile = getUser();
    profile.defaultApp = newDefault;
    profile.save();
    return success();
  }
}
