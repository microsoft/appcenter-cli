import { Command, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../util/commandline";
import { out } from "../../util/interaction";
import { AppCenterClient, models, clientRequest } from "../../util/apis";

const debug = require("debug")("appcenter-cli:commands:orgs:show");
import { inspect } from "util";
import { getPortalOrgLink } from "../../util/portal/portal-helper";
import { getOrgUsers, pickAdmins } from "./lib/org-users-helper";

@help("Show information about organization")
export default class OrgShowCommand extends Command {
  @help("Name of the organization")
  @shortName("n")
  @longName("name")
  @required
  @hasArg
  name: string;

  async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const [users, apps, organizationDetails] = await out.progress("Loading organization information...", Promise.all([getOrgUsers(client, this.name, debug), this.getOrgApps(client, this.name), this.getOrgDetails(client, this.name)]));

    const admins = pickAdmins(users);

    out.report([
      ["Display name", "displayName"],
      ["URL", "url"],
      ["Admins", "admins", (adminsArray: models.OrganizationUserResponse[]) => adminsArray.map((admin) => admin.name).join(", ")],
      ["Apps", "appsCount"],
      ["Collaborators", "collaboratorsCount"],
    ], { displayName: organizationDetails.displayName, url: getPortalOrgLink(portalBaseUrl, this.name), admins, appsCount: apps.length, collaboratorsCount: users.length, origin: organizationDetails.origin });

    return success();
  }

  private async getOrgApps(client: AppCenterClient, organization: string): Promise<models.AppResponse[]> {
    try {
      const httpResponse = await clientRequest<models.AppResponse[]> ((cb) => client.apps.listForOrg(organization, cb));
      if (httpResponse.response.statusCode < 400) {
        return httpResponse.result;
      } else {
        throw httpResponse.response;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `organization ${organization} doesn't exist`);
      } else {
        debug(`Failed to load list of organization apps - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to load list of organization apps");
      }
    }
  }

  private async getOrgDetails(client: AppCenterClient, organization: string): Promise<models.OrganizationResponse> {
    try {
      const httpResponse = await clientRequest<models.OrganizationResponse>((cb) => client.organizations.get(organization, cb));
      if (httpResponse.response.statusCode < 400) {
        return httpResponse.result;
      } else {
        throw httpResponse.response;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `organization ${organization} doesn't exist`);
      } else {
        debug(`Failed to get organization details - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to get organization details");
      }
    }
  }
}
