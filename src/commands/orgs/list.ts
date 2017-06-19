import { Command, CommandResult, help, success, failure, ErrorCodes } from "../../util/commandline";
import { out } from "../../util/interaction";
import { MobileCenterClient, models, clientRequest } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:orgs:list");
import { inspect } from "util";

@help("Lists organizations in which current user is collaborator")
export default class OrgListCommand extends Command {
  async run(client: MobileCenterClient): Promise<CommandResult> {
    // every user is a collaborator of it's own group and of zero or more external groups
    const orgs = await out.progress("Loading list of organizations...", this.getOrgsNamesList(client));
    const table = [["Display Name", "Name", "Origin"]]
      .concat(orgs.map((names) => [names.displayName, names.name, names.origin]));

    out.table(out.getNoTableBordersCollapsedVerticallyOptions(""), table);

    return success();
  }

  private async getOrgsNamesList(client: MobileCenterClient): Promise<IEntity[]> {
    try {
      const httpResponse = await clientRequest<models.OrganizationResponse[]>((cb) => client.organizations.list(cb));
      if (httpResponse.response.statusCode < 400) {
        return httpResponse.result.map((org) => ({
          name: org.name,
          displayName: org.displayName,
          origin: org.origin
        }));
      } else {
        throw httpResponse.response;
      }
    } catch (error) {
      debug(`Failed to load list of organization for current user - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to load list of organization for the user");
    }
  }
}

interface IEntity {
  name: string;
  displayName: string;
  origin: string;
}
