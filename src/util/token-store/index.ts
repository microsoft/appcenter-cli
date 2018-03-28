import * as os from "os";
import * as path from "path";

import { createFileTokenStore } from "./file/file-token-store";
import { createWinTokenStore } from "./win32/win-token-store";
import { createOsxTokenStore } from "./osx/osx-token-store";
import { getProfileDir, tokenFile } from "../misc";
import { TokenStore } from "./token-store";

export * from "./token-store";

// Create default token store based on OS
//
// For now, every OS uses file
//

let store: TokenStore;

if (os.platform() === "win32") {
  store = createWinTokenStore();
} else if (os.platform() === "darwin") {
  store = createOsxTokenStore();
} else {
  const tokenFilePath = path.join(getProfileDir(), tokenFile);
  store = createFileTokenStore(tokenFilePath);
}

export const tokenStore = store;
