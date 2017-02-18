import * as JsZip from "jszip";
import * as Path from "path";
import * as Pfs from "./promisfied-fs";
import * as mkdirp from "mkdirp";

/**
 * Unpacks ZIP file contents to the specified folder (it should already exist)
 */
export async function unpackZipToPath(path: string, zip: JSZip): Promise<void> {
  let entries = zip.filter((relativePath, file) => !file.dir);

  for (const entry of entries){
    // Creating directory path if needed    
    mkdirp.sync(Path.join(path, Path.dirname(entry.name)));
    
    let buffer: Buffer = await entry.async("nodebuffer");
    await Pfs.writeFile(Path.join(path, entry.name), buffer);
  }
}

/**
 * Writes zip file to the specified location
 */
export async function writeZipToPath(path: string, zip: JSZip): Promise<void> {
  let zipBuffer = await (<Promise<Buffer>> zip.generateAsync({
    type: "nodebuffer"
  }));

  await Pfs.writeFile(path, zipBuffer);
}
