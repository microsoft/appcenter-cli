import * as os from "os";
import * as path from "path";
import * as pfs from "./promisfied-fs";
import * as process from "./process-helper";
import * as JsZip from "jszip";
import * as JsZipHelper from "../../util/misc/jszip-helper";

export async function archiveAppBundle(appPath: string, ipaPath: string): Promise<void> {
    async function archiveWithDitto(appPath: string, ipaPath: string): Promise<void> {
        const appPathBase = path.parse(appPath).base;

        const tempPath = await pfs.mkTempDir("ios-bundle-archiver");
        const payloadPath = path.join(tempPath, "Payload");
        await pfs.mkdir(payloadPath);
        const tempAppPath = path.join(payloadPath, appPathBase);

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

    async function archiveWithZip(appPath: string, ipaPath: string) : Promise<void> {
        const zipArchive = new JsZip();
        const payload =  zipArchive.folder("Payload");

        try {
            await JsZipHelper.addFolderToZipRecursively(appPath, payload);
            await JsZipHelper.writeZipToPath(ipaPath, zipArchive, "DEFLATE");
        } catch (error) {
            throw Error(`unable to create ipa from ${appPath}`);
        }
    }

    if (!(os.platform() === "darwin")) {
        await archiveWithZip(appPath, ipaPath);
    } else {
        await archiveWithDitto(appPath, ipaPath);
    }
  }
