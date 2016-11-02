import { SonomaClient, models, clientCall } from "../../util/apis";
import { Profile, deleteUser } from "../../util/profile";
import { out } from "../../util/interaction";

export async function logout(client: SonomaClient, user: Profile): Promise<void> {
  try {
  await out.progress("Logging out current user...",
    clientCall(async cb => client.account.deleteApiToken(await user.accessTokenId, cb)));
  } catch (err) {
    // Noop, it's ok if deletion fails
  }
  deleteUser();
}
