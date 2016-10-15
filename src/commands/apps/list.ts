import { Command, CommandArgs, CommandResult, help, success, failure, notLoggedIn } from "../../util/commandline";
import { out } from "../../util/interaction";
import { getUser } from "../../util/profile";
import { SonomaClient, models, clientCall } from "../../util/apis";

@help("Get list of configured applications")
export default class AppsListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  formatApp(app: models.AppResponse): string {
    return `  ${app.owner.name}/${app.name}`;
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    const apps = await out.progress("Getting app list ...",
      clientCall<models.AppResponse[]>(cb => client.account.getApps(cb)));

    out.list(this.formatApp, apps);

    return success();
  }
}
