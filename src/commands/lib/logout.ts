import { MobileCenterClient, models, clientRequest } from "../../util/apis";
import { Profile, deleteUser } from "../../util/profile";
import { out } from "../../util/interaction";

const debug = require("debug")("mobile-center-cli:commands:lib:logout");

export async function logout(client: MobileCenterClient, user: Profile): Promise<void> {
  // Only delete token off the server if CLI created it.
  if (!user.tokenSuppliedByUser) {
    let tokenId: string;
    try {
    await out.progress("Logging out current user...",
      clientRequest(async cb => {
        try {
          tokenId = await user.accessTokenId;
          if (!tokenId) {
            tokenId = "current";
          }
          debug(`Attempting to delete token id ${tokenId} off server`);
          client.apiTokens.deleteMethod(tokenId, cb);
        } catch(err) {
          debug('Could not retrieve current token from token store');
          cb(err, null, null, null);
        }
      }));
    } catch (err) {
      // Noop, it's ok if deletion fails
      debug(`Deletion of token id ${tokenId} from server failed, error ${err}`);
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
