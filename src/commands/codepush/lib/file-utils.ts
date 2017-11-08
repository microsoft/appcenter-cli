
import * as pfs from "../../../util/misc/promisfied-fs";
import * as path from "path";
import * as os from "os";

export function isBinaryOrZip(path: string): boolean {
  return path.search(/\.zip$/i) !== -1
      || path.search(/\.apk$/i) !== -1
      || path.search(/\.ipa$/i) !== -1;
}

export async function copyFileToTmpDir(filePath: string): Promise<string> {
  if (!(await pfs.stat(filePath)).isDirectory()) {
    let outputFolderPath: string = await pfs.mkTempDir("code-push");
    await pfs.rmDir(outputFolderPath)
    await pfs.mkdir(outputFolderPath);

    let outputFilePath: string = path.join(outputFolderPath, path.basename(filePath));
    await pfs.writeFile(outputFilePath, await pfs.readFile(filePath));

    return outputFolderPath;
  }
}

export function generateRandomFilename(length: number): string {
  let filename: string = "";
  const validChar: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    filename += validChar.charAt(Math.floor(Math.random() * validChar.length));
  }

  return filename;
}

export async function fileDoesNotExistOrIsDirectory(filePath: string): Promise<boolean> {
  try {
      return (await pfs.stat(filePath)).isDirectory();
  } catch (error) {
      return true;
  }
}

export async function createEmptyTempReleaseFolder(folderPath: string): Promise<void> {
  await pfs.rmDir(folderPath);
  await pfs.mkdir(folderPath);
  return Promise.resolve();
}

export async function removeReactTmpDir(): Promise<void> {
  await pfs.rmDir(`${os.tmpdir()}/react-*`);
}