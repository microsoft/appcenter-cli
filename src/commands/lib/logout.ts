import { SonomaClient, models, clientCall } from "../../util/apis";
import { Profile, deleteUser } from "../../util/profile";
import { out } from "../../util/interaction";

export async function logout(client: SonomaClient, user: Profile): Promise<void> {
  await out.progress("Logging out current user...",
    clientCall(cb => client.account.deleteApiToken(user.accessTokenId, cb)));
  deleteUser();
}
