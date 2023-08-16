import { AppCenterClient, models } from "../../../util/apis";
import { handleHttpError } from "../../../util/apis/create-client";

export async function getOrgUsers(
  client: AppCenterClient,
  organization: string,
  debug: Function
): Promise<models.OrganizationUserResponse[]> {
  try {
    return await client.users.listForOrg(organization);
  } catch (error) {
    await handleHttpError(error, true, "failed to load list of organization users", `organization ${organization} doesn't exist`);
  }
}

export async function getOrgsNamesList(client: AppCenterClient): Promise<IEntity[]> {
  try {
    const result = await client.organizations.list();
    return result.map((org) => ({
      name: org.name,
      displayName: org.displayName,
      origin: org.origin,
    }));
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
