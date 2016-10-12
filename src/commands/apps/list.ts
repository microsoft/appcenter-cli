import { Command, CommandArgs, CommandResult, help, success, failure, notLoggedIn } from "../../util/commandline";
import { out } from "../../util/interaction";
import { getUser } from "../../util/profile";
import { AppsClient, AppResponse } from "../../util/apis";

@help("Get list of configured applications")
export default class AppsListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  formatApp(app: AppResponse): string {
    return `  ${app.owner.name}/${app.name}`;
  }

  async run(): Promise<CommandResult> {
    const currentUser = getUser();
    if (!currentUser) {
      return notLoggedIn('apps list');
    }

    const client = new AppsClient(currentUser.endpoint, currentUser.accessToken);
    const apps = await out.progress("Getting app list ...", client.list());

    out.list(this.formatApp, apps);

    return success();
  }
}
