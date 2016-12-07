import { AppCommand, CommandArgs, CommandResult, help, success } from "../../util/commandline";
import { out } from "../../util/interaction";
import { DefaultApp } from "../../util/profile";
import { MobileCenterClient, models, clientCall } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:list");
import { inspect } from "util";

@help("Get list of configured applications")
export default class AppsListCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  formatApp(defaultApp: DefaultApp, app: models.AppResponse): string {
    let prefix = "  ";
    let suffix = "";
    if (defaultApp && (defaultApp.appName === app.name && defaultApp.ownerName === app.owner.name)) {
      prefix = "* ";
      suffix = " (current app)";
    }
    return `${prefix}${app.owner.name}/${app.name}${suffix}`;
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const apps = await out.progress("Getting app list ...",
      clientCall<models.AppResponse[]>(cb => client.account.getApps(cb)));

    const defaultApp = this.app;
    debug(`Current app = ${inspect(defaultApp)}`);
    out.list(app => this.formatApp(defaultApp, app), apps);

    return success();
  }
}
