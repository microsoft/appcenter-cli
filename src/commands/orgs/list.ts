import { Command, CommandResult, help, success, failure, ErrorCodes } from "../../util/commandline";
import { out } from "../../util/interaction";
import { MobileCenterClient, models, clientRequest } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:orgs:list");
import { inspect } from "util";

@help("Lists organizations in which current user is collaborator")
export default class OrgListCommand extends Command {
  async run(client: MobileCenterClient): Promise<CommandResult> {
    // every user is a collaborator of it's own group and of zero or more external groups
    const [currentUserName, externalOrgsNames] = await out.progress("Loading list of organizations...", Promise.all([this.getCurrentUserName(client), this.getOrgsNamesList(client)]));
    const orgsNames = [[currentUserName]].concat(externalOrgsNames.map((name) => [name]));

    out.table(out.getNoTableBordersOptions(), orgsNames);

    return success();
  }

  private async getOrgsNamesList(client: MobileCenterClient): Promise<string[]> {
    try {
      const httpResponse = await clientRequest<models.OrganizationResponse[]>((cb) => client.organizations.list(cb));
      if (httpResponse.response.statusCode < 400) {
        return httpResponse.result.map((org) => org.name);
      } else {
        throw httpResponse.response;
      }
    } catch (error) {
      debug(`Failed to load list of organization for current user - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to load list of organization for the user");
    }
  }

  private async getCurrentUserName(client: MobileCenterClient): Promise<string> {
    try {
      const httpResponse = await clientRequest<models.UserProfileResponse>((cb) => client.users.get(cb));
      if (httpResponse.response.statusCode < 400) {
        return httpResponse.result.name;
      } else {
        throw httpResponse.response;
      }
    } catch (error) {
      debug(`Failed to get current user profile - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get current user profile");
    }
  }
}
