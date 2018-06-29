// Helper functions for file system

import * as fs from "fs";
import * as path from "path";

export function fileExistsSync(filename: string): boolean {
  try {
    return fs.statSync(filename).isFile();
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
  return false;
}

export function directoryExistsSync(dirname: string): boolean {
  try {
    return fs.statSync(dirname).isDirectory();
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
  return false;
}

export function createLongPath(target: string) {
  let targetFolder: string = target;
  const notExistsFolder: string[] = [];

  while (!fs.existsSync(targetFolder)) {
    notExistsFolder.push(path.basename(targetFolder));
    targetFolder = path.resolve(targetFolder, "..");
  }

  notExistsFolder.reverse().forEach((element) => {
    targetFolder = path.resolve(targetFolder, element);
    fs.mkdirSync(targetFolder);
  });
}

export function generateAbsolutePath(somePath: string): string {
  if (path.isAbsolute(somePath)) {
    return somePath;
  }
  return path.join(process.cwd(), somePath);
}
