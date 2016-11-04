import * as os from "os";
import * as path from "path";

import { profileDirName } from "./constants";

export function getProfileDir(): string {
  let profileDir: string;
  if (os.platform() === "win32") {
    profileDir = process.env.AppData;
  } else {
    profileDir = os.homedir();
  }

  profileDir = path.join(profileDir, profileDirName);
  return profileDir;
}
