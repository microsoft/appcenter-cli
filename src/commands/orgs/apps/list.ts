import { Command, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";

const debug = require("debug")("appcenter-cli:commands:orgs:apps:list");
import { inspect } from "util";

@help("Lists applications of organization")
export default class OrgAppsListCommand extends Command {
  @help("Name of the organization")
  @shortName("n")
  @longName("name")
  @required
  @hasArg
  name: string;

  async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    try {
      const httpResponse = await out.progress("Loading list of organization apps...", clientRequest<models.AppResponse[]>((cb) => client.apps.listForOrg(this.name, cb)));
      if (httpResponse.response.statusCode < 400) {
        const table = httpResponse.result.map((app) => [app.displayName, app.name, app.os, app.platform]);
        out.table(out.getCommandOutputTableOptions(["Display Name", "Name", "OS", "Platform"]), table);
        return success();
      } else {
        throw httpResponse.response;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        return failure(ErrorCodes.InvalidParameter, `organization ${this.name} doesn't exist`);
      } else {
        debug(`Failed to load apps of organization - ${inspect(error)}`);
        return failure(ErrorCodes.Exception, `failed to load apps of organization`);
      }
    }
  }
}
