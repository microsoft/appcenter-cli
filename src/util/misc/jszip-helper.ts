import * as JsZip from "jszip";
import * as Path from "path";
import * as Pfs from "./promisfied-fs";
import * as Fs from "fs";

/**
 * Unpacks ZIP file contents to the specified folder (it should already exist)
 * root parameter can be used to extract specific folder from the zip archive
 */
export async function unpackZipToPath(path: string, zip: JSZip, root: string = ""): Promise<void> {
  const entries = zip.filter((relativePath, file) => file.name.startsWith(root));

  for (const entry of entries){
    const zipPath = entry.name.substring(root.length);

    if (entry.dir) {
      await Pfs.mkdirp(Path.join(path, zipPath));
    } else {
      const fileDirPath = Path.join(path, Path.dirname(zipPath));
      // Creating directory path if needed    
      await Pfs.mkdirp(fileDirPath);

      let buffer: Buffer = await entry.async("nodebuffer");
      await Pfs.writeFile(Path.join(fileDirPath, Path.basename(zipPath)), buffer);
    }
  }
}

/**
 * Writes zip file to the specified location
 */
export async function writeZipToPath(path: string, zip: JSZip, compression: "STORE" | "DEFLATE"): Promise<void> {
  let zipBuffer = await (<Promise<Buffer>> zip.generateAsync({
    type: "nodebuffer",
    compression
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
      const fileStream = Fs.createReadStream(subEntityPath);
      folderZip.file(subEntityName, fileStream);
    }
  }
}
