import { MobileCenterClient, models, clientRequest } from "../../util/apis";
import { Profile, deleteUser } from "../../util/profile";
import { out } from "../../util/interaction";

const debug = require("debug")("mobile-center-cli:commands:lib:logout");

export async function logout(client: MobileCenterClient, user: Profile): Promise<void> {
  // Only delete token off the server if CLI created it.
  if (!user.tokenSuppliedByUser) {
    try {
    await out.progress("Logging out current user...",
      clientRequest(async cb => {
        try {
          debug('Attempting to delete token off server');
          client.apiTokens.deleteMethod(await user.accessTokenId, cb);
        } catch(err) {
          debug('Could not retrieve token ID from token store');
          cb(err, null, null, null);
        }
      }));
    } catch (err) {
      // Noop, it's ok if deletion fails
    }
  }
  try {
    debug('Deleting user token from token store');
    await deleteUser();
  } catch (err) {
    // Noop, it's ok if deletion fails
    debug('User token deletion failed');
  }
}
