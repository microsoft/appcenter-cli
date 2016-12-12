import { Command, CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp } from "../../util/commandline";
import { out } from "../../util/interaction";
import { DefaultApp } from "../../util/profile";
import { MobileCenterClient, models, clientRequest } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:list");
import { inspect } from "util";

@help("Get list of configured applications")
export default class AppsListCommand extends Command {
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
    const appsResponse = await out.progress("Getting app list ...",
      clientRequest<models.AppResponse[]>(cb => client.account.getApps(cb)));

    if (appsResponse.response.statusCode >= 400) {
      return failure(ErrorCodes.Exception, "Unknown error when loading apps");
    }

    const defaultApp = getCurrentApp(null);
    debug(`Current app = ${inspect(defaultApp)}`);
    out.list(app => this.formatApp(defaultApp.value, app), appsResponse.result);

    return success();
  }
}
