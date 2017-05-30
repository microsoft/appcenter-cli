import { Command, CommandArgs, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../util/commandline";
import { out } from "../../util/interaction";
import { MobileCenterClient, models, clientRequest, ClientResponse } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:orgs:show");
import { inspect } from "util";
import { getPortalOrgLink } from "../../util/portal/portal-helper";

@help("Show information about organization")
export default class OrgShowCommand extends Command {
  @help("Name of the organization")
  @shortName("n")
  @longName("name")
  @required
  @hasArg
  name: string;

  async run(client: MobileCenterClient, portalBaseUrl: string): Promise<CommandResult> {    
    const [users, apps, organizationDetails] = await out.progress("Loading organization information...", Promise.all([this.getOrgUsers(client, this.name), this.getOrgApps(client, this.name), this.getOrgDetails(client, this.name)]));

    const admins = users.filter((user) => user.role === "admin");

    out.report([
      ["Display name", "displayName"],
      ["URL", "url"],
      ["Admins", "admins", (adminsArray: models.OrganizationUserResponse[]) => adminsArray.map((admin) => admin.name).join(", ")],
      ["Apps", "appsCount"],
      ["Collaborators", "collaboratorsCount"]
    ], { displayName: organizationDetails.displayName, url: getPortalOrgLink(portalBaseUrl, this.name), admins, appsCount: apps.length, collaboratorsCount: users.length });

    return success();
  }

  private async getOrgUsers(client: MobileCenterClient, organization: string): Promise<models.OrganizationUserResponse[]> {
    try {
      const httpResponse = await clientRequest<models.OrganizationUserResponse[]>((cb) => client.users.listForOrg(organization, cb));
      if (httpResponse.response.statusCode < 400) {
        return httpResponse.result;
      } else {
        throw httpResponse.response;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `organization ${organization} doesn't exist`);
      } else {
        debug(`Failed to load list of organization users - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to load list of organization users");
      }
    }
  }

  private async getOrgApps(client: MobileCenterClient, organization: string): Promise<models.AppResponse[]> {
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

  private async getOrgDetails(client: MobileCenterClient, organization: string): Promise<models.OrganizationResponse> {
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
