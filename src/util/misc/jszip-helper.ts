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

/**
 * Adds the folder and it's content to the zip
 */
export async function addFolderToZipRecursively(path: string, zip: JsZip): Promise<void> {
  let subEntitiesNames = await Pfs.readdir(path);
  let folderZip = zip.folder(Path.basename(path));

  for (let subEntityName of subEntitiesNames){
    let subEntityPath = Path.join(path, subEntityName);
    let subEntityStats = await Pfs.stat(subEntityPath);
    if (subEntityStats.isDirectory()) {
      await addFolderToZipRecursively(subEntityPath, folderZip);
    } else {
      let fileBuffer = await Pfs.readFile(subEntityPath);
      folderZip.file(subEntityName, fileBuffer);
    }
  }
}
