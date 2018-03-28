import { AppCenterClient, clientRequest } from "../../util/apis";
import { Profile, deleteUser } from "../../util/profile";
import { out } from "../../util/interaction";

const debug = require("debug")("appcenter-cli:commands:lib:logout");

// How long to wait before giving up on the token being deleted
const maxTokenDeletionTimeoutSec = 10;

export async function logout(client: AppCenterClient, user: Profile): Promise<void> {
  await out.progress("Logging out current user...", performLogout(client, user));
}

async function performLogout(client: AppCenterClient, user: Profile): Promise<void> {
  // Only delete token off the server if CLI created it.
  if (!user.tokenSuppliedByUser) {
    let tokenId: string;
    try {
      await Promise.race([
          clientRequest(async (cb) => {
            try {
              tokenId = await user.accessTokenId;
              if (!tokenId || tokenId === "null") {
                tokenId = "current";
              }
              debug(`Attempting to delete token id ${tokenId} off server`);
              client.apiTokens.deleteMethod(tokenId, cb);
            } catch (err) {
              debug("Could not retrieve current token from token store");
              cb(err, null, null, null);
            }
          }),
          new Promise((resolve, reject) => setTimeout(() => {
            // TODO: Investigate if there's a way to explicitly cancel the outstanding call.
            resolve();
          }, maxTokenDeletionTimeoutSec * 1000))
        ]);
    } catch (err) {
      // Noop, it's ok if deletion fails
      debug(`Deletion of token id ${tokenId} from server failed, error ${err}`);
    }
  }
  try {
    debug("Deleting user token from token store");
    await deleteUser();
  } catch (err) {
    // Noop, it's ok if deletion fails
    debug("User token deletion failed");
  }
}
