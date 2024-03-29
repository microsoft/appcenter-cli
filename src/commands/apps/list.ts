import { Command, CommandArgs, CommandResult, help, success, getCurrentApp, ErrorCodes, failure } from "../../util/commandline";
import { out } from "../../util/interaction";
import { DefaultApp } from "../../util/profile";
import { AppCenterClient, models } from "../../util/apis";

const debug = require("debug")("appcenter-cli:commands:apps:list");
import { inspect } from "util";

import * as _ from "lodash";

@help("Get list of configured applications")
export default class AppsListCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  formatApp(defaultApp: DefaultApp, app: models.AppsGetResponse): string {
    let prefix = "  ";
    let suffix = "";
    if (defaultApp && defaultApp.appName === app.name && defaultApp.ownerName === app.owner.name) {
      prefix = "* ";
      suffix = " (current app)";
    }
    return `${prefix}${app.owner.name}/${app.name}${suffix}`;
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    let appsResponse: models.AppsListResponse;
    try {
      appsResponse = await out.progress("Getting app list ...", client.apps.list());
    } catch (error) {
      if (error.response.status >= 400) {
        return failure(ErrorCodes.Exception, "Unknown error when loading apps");
      }
    }

    const defaultApp = getCurrentApp(null);
    debug(`Current app = ${inspect(defaultApp)}`);

    const sortedApps = _.sortBy(appsResponse, (app) => (app.owner.name + app.name).toLowerCase());
    out.list((app) => this.formatApp(defaultApp.value, app), sortedApps);

    return success();
  }
}
