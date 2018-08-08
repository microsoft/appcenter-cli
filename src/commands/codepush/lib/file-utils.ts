import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as rimraf from "rimraf";
import * as temp from "temp";

export function isBinaryOrZip(path: string): boolean {
  return path.search(/\.zip$/i) !== -1
      || path.search(/\.apk$/i) !== -1
      || path.search(/\.ipa$/i) !== -1;
}

export function isDirectory(path: string): boolean {
  return fs.statSync(path).isDirectory();
}

export function copyFileToTmpDir(filePath: string): string {
  if (!isDirectory(filePath)) {
    const outputFolderPath: string = temp.mkdirSync("code-push");
    rimraf.sync(outputFolderPath);
    fs.mkdirSync(outputFolderPath);

    const outputFilePath: string = path.join(outputFolderPath, path.basename(filePath));
    fs.writeFileSync(outputFilePath, fs.readFileSync(filePath));

    return outputFolderPath;
  }
}

export function moveReleaseFilesInTmpFolder(updateContentsPath: string): string {
    let tmpUpdateContentsPath: string = temp.mkdirSync("code-push");
    tmpUpdateContentsPath = path.join(tmpUpdateContentsPath, "CodePush");
    fs.mkdirSync(tmpUpdateContentsPath);

    if (isDirectory(updateContentsPath)) {
      copyFolderRecursiveSync(normalizePath(updateContentsPath), normalizePath(tmpUpdateContentsPath));
    } else {
      copyFileSync(updateContentsPath, tmpUpdateContentsPath);
    }

    return tmpUpdateContentsPath;
}

export function getLastFolderInPath(path: string): string {
  const splittedPath = path.split("/").filter((el) => { return el !== ""; });
  if (isDirectory(path)) {
    return splittedPath[splittedPath.length - 1];
  } else {
    return splittedPath[splittedPath.length - 2];
  }
}

function copyFileSync(source: string, target: string) {
  let targetFile = target;
  if (fs.existsSync(target)) {
      if (fs.lstatSync(target).isDirectory()) {
          targetFile = path.join(target, path.basename(source));
      }
  }
  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source: string, target: string) {
  let files = [];

  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      const curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
}

export function generateRandomFilename(length: number): string {
  let filename: string = "";
  const validChar: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    /* tslint:disable-next-line:insecure-random */
    filename += validChar.charAt(Math.floor(Math.random() * validChar.length));
  }

  return filename;
}

export function fileDoesNotExistOrIsDirectory(path: string): boolean {
  try {
      return isDirectory(path);
  } catch (error) {
      return true;
  }
}

export function createEmptyTmpReleaseFolder(folderPath: string): void {
  rimraf.sync(folderPath);
  fs.mkdirSync(folderPath);
}

export function removeReactTmpDir(): void {
  rimraf.sync(`${os.tmpdir()}/react-*`);
}

export function normalizePath(filePath: string): string {
  //replace all backslashes coming from cli running on windows machines by slashes
  return filePath.replace(/\\/g, "/");
}
