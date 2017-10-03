import { MobileCenterClient, models, clientRequest, ClientResponse } from "../../../util/apis";
import { failure, ErrorCodes } from "../../../util/commandline";
import { inspect } from "util";

export async function getOrgUsers(client: MobileCenterClient, organization: string, debug: Function): Promise<models.OrganizationUserResponse[]> {
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

export async function getOrgsNamesList(client: MobileCenterClient, debug: Function): Promise<IEntity[]> {
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

export function pickAdmins(users: models.OrganizationUserResponse[]): models.OrganizationUserResponse[] {
  return users.filter((user) => user.role === "admin");
}

interface IEntity {
  name: string;
  displayName: string;
  origin: string;
}