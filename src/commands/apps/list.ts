import { Command, CommandArgs, CommandResult, help, success, failure, notLoggedIn } from "../../util/commandline";
import { out } from "../../util/interaction";
import { getUser } from "../../util/profile";
import { createSonomaClient, models } from "../../util/apis";

@help("Get list of configured applications")
export default class AppsListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  formatApp(app: models.AppResponse): string {
    return `  ${app.owner.name}/${app.name}`;
  }

  async run(): Promise<CommandResult> {
    const currentUser = getUser();
    if (!currentUser) {
      return notLoggedIn('apps list');
    }

    const client = createSonomaClient(currentUser);;
    const apps = await out.progress("Getting app list ...", new Promise<models.AppResponse[]>((resolve, reject) => {
      client.account.getApps((err, result) => {
        if (err) { reject(err); }
        else { resolve(result); }
      });
    }));

    out.list(this.formatApp, apps);

    return success();
  }
}
