import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { handleHttpError } from "../../../util/apis/create-client";

export async function getOrgUsers(client: AppCenterClient, organization: string, debug: Function): Promise<models.OrganizationUserResponse[]> {
  try {
    const httpResponse = await clientRequest<models.OrganizationUserResponse[]>((cb) => client.users.listForOrg(organization, cb));
    if (httpResponse.response.statusCode < 400) {
      return httpResponse.result;
    } else {
      throw httpResponse.response;
    }
  } catch (error) {
    await handleHttpError(error, true, "failed to load list of organization users",
    `organization ${organization} doesn't exist`);
  }
}

export async function getOrgsNamesList(client: AppCenterClient): Promise<IEntity[]> {
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
    await handleHttpError(error, false, "failed to load list of organizations");
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
