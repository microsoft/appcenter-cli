import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { profileDirName, oldProfileDirName } from "./constants";

const debug = require("debug")("appcenter-cli:util:misc:get-profile-dir");

export function getProfileDir(): string {
  const profileDir = path.join(getProfileDirParent(), profileDirName);
  const oldProfileDir = path.join(getProfileDirParent(), oldProfileDirName);
  if (!existsSync(profileDir) && existsSync(oldProfileDir)) {
    copyDirSync(oldProfileDir, profileDir);
  }
  return profileDir;
}

export function getProfileDirParent(): string {
  if (os.platform() === "win32") {
    return process.env.AppData;
  } else {
    return os.homedir();
  }
}

function existsSync(path: string): boolean {
  try {
    fs.statSync(path);
    return true;
  } catch (err) {
    if (err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

//
// Copy the old profile directory over to the new name.
//
function copyDirSync(srcPath: string, destPath: string): void {
  debug(`Copying profile from ${srcPath} to ${destPath}`);
  fs.mkdirSync(destPath);
  const files = fs.readdirSync(srcPath);
  files
    .map((f: string): [string, string] => [path.join(srcPath, f), path.join(destPath, f)])
    .filter(([src, dest]) => isFileSync(src))
    .forEach(([src, dest]) => copyFileSync(src, dest));
}

function isFileSync(file: string): boolean {
  const stats = fs.statSync(file);
  return stats.isFile();
}

//
// fs.copyFileSync is only in very new version of node 8, so implement
// it locally as compat shim
//
function copyFileSync(srcPath: string, destPath: string): void {
  debug(`Copying file ${srcPath} to ${destPath}`);
  const contents = fs.readFileSync(srcPath);
  fs.writeFileSync(destPath, contents);
}
