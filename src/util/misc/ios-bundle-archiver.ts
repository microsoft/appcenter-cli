import * as os from "os";
import * as path from "path";
import * as pfs from "./promisfied-fs";
import * as process from "./process-helper";

export async function archiveAppBundle(appPath: string, ipaPath: string): Promise<void> {
    if (!(os.platform() === "darwin")) {
      throw Error("iOS applications can only be archived on OS-X");
    }
    let appPathBase = path.parse(appPath).base;

    let tempPath = await pfs.mkTempDir("ios-bundle-archiver");
    let payloadPath = path.join(tempPath, "Payload");
    await pfs.mkdir(payloadPath);
    let tempAppPath = path.join(payloadPath, appPathBase);

    let exitCode = await process.execAndWait(`ditto "${appPath}" "${tempAppPath}"`);
    if (exitCode !== 0) {
      await pfs.rmDir(tempPath, true);
      throw new Error("Cannot archive app bundle.");
    }
    
    exitCode = await process.execAndWait(`ditto -ck --sequesterRsrc "${tempPath}" "${ipaPath}"`);
    if (exitCode !== 0) {
      await pfs.rmDir(tempPath, true);
      throw new Error("Cannot archive app bundle.");
    }

    await pfs.rmDir(tempPath, true);
  }