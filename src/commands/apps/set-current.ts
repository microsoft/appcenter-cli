import { Command, CommandArgs, CommandResult, success, failure, name, help, position, required, ErrorCodes } from "../../util/commandline";
import { AppCenterClient, models, clientCall } from "../../util/apis";
import { out } from "../../util/interaction";
import { toDefaultApp, getUser } from "../../util/profile";

@help("Set default application for all CLI commands. Not compatible when authenticating with '--token' or an environment variable. Use environment variable 'MOBILE_CENTER_CURRENT_APP' to set the default app instead.")
export default class SetCurrentAppCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @name("app")
  @position(0)
  @help("Owner/app to set as default")
  @required
  appId: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    const newDefault = toDefaultApp(this.appId);
    if (!newDefault) {
      return failure(ErrorCodes.InvalidParameter, `'${this.appId}' is not a valid application.`);
    }

    const apps = await out.progress("Reading available apps...",
      clientCall<models.AppResponse[]>((cb) => client.apps.list(cb)));

    const found = apps.find((app) => app.name === newDefault.appName && app.owner.name === newDefault.ownerName);
    if (!found) {
      return failure(ErrorCodes.InvalidParameter, `You either do not have access to '${this.appId}' or there is no such application.`);
    }

    const profile = getUser();

    if (!profile) {
      return failure(ErrorCodes.InvalidParameter,
        `Could not find a logged in profile, please note that this command is not compatible with the '--token' parameter or the token environment variable.`);
    }

    profile.defaultApp = newDefault;
    profile.save();
    return success();
  }
}
