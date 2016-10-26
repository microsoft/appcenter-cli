import { Command, CommandArgs, CommandResult, help, success, failure, failed, notLoggedIn, getCurrentApp } from "../../util/commandline";
import { out } from "../../util/interaction";
import { DefaultApp, getUser } from "../../util/profile";
import { SonomaClient, models, clientCall } from "../../util/apis";

@help("Get list of configured applications")
export default class AppsListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  formatApp(defaultApp: DefaultApp, app: models.AppResponse): string {
    return `  ${app.owner.name}/${app.name}`;
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    const apps = await out.progress("Getting app list ...",
      clientCall<models.AppResponse[]>(cb => client.account.getApps(cb)));

    const user = getUser();
    const defaultApp: DefaultApp = user ? user.defaultApp : null;
    out.list(app => this.formatApp(defaultApp, app), apps);

    return success();
  }
}
