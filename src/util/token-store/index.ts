import * as os from "os";
import * as path from "path";

import { FileTokenStore, createFileTokenStore } from "./file/file-token-store";

export * from "./token-store";

// Create default token store based on OS
//
// For now, every OS uses file
//

