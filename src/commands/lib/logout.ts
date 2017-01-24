import { MobileCenterClient, models, clientCall } from "../../util/apis";
import { Profile, deleteUser } from "../../util/profile";
import { out } from "../../util/interaction";

export async function logoutOld(client: MobileCenterClient, user: Profile): Promise<void> {
  // Only delete token off the server if CLI created it.
  if (!user.tokenSuppliedByUser) {
    try {
    await out.progress("Logging out current user...",
      clientCall(async cb => client.account.deleteApiToken(await user.accessTokenId, cb)));
    } catch (err) {
      // Noop, it's ok if deletion fails
    }
  }
  deleteUser();
}

export async function logout(client: MobileCenterClient, user:Profile): Promise<void> {
  deleteExistingToken(client, user)
    .then(() => deleteUser());
}

function deleteExistingToken(client: MobileCenterClient, user: Profile): Promise<void> {
  if (user.tokenSuppliedByUser) {
    return Promise.resolve();
  }

  return out.progress("Logging out current user...",
    user.accessTokenId.then((id) =>
      clientCall(cb => client.account.deleteApiToken(id, cb))))
    .then(() => {});
}
