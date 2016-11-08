import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";

export function stat(path: string | Buffer): Promise<fs.Stats> {
  return callFs(fs.stat, path);
}

export function readdir(path: string | Buffer): Promise<string[]> {
  return callFs(fs.readdir, path);
}

export function writeFile(filename: string, data: any): Promise<void> {
  return callFs(fs.writeFile, filename, data);
}

export function exists(path: string | Buffer): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.exists(path, resolve);
  });
}

export function mkdir(path: string | Buffer): Promise<void> {
  return callFs(fs.mkdir, path);
}

export async function copy(source: string, target: string): Promise<void> {
  let sourceStats = await stat(source);
  if (sourceStats.isDirectory()) {
    await copyDir(source, target);
  }  
  else {
    await copyFile(source, target);
  }
}

export async function copyDir(source: string, target: string): Promise<void> {
  if (!await exists(target)) {
    await mkdir(target);
  }
  let files = await readdir(source);

  for (let i = 0; i < files.length; i++) {
    let sourceEntry = path.join(source, files[i]);
    let targetEntry = path.join(target, files[i]);

    await copy(sourceEntry, targetEntry);
  }
}

export async function copyFile(source: string, target: string): Promise<void> {
  fs.createReadStream(source).pipe(fs.createWriteStream(target));
}

function callFs<TArg, TResult>(func: (arg: TArg, callback: (err: any, result?: TResult) => void) => void, ...args: any[]): Promise<TResult> {
  return new Promise<TResult>((resolve, reject) => {
    func.apply(fs, _.concat(args, [
      (err: any, result: TResult) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(result);
        }
      }
    ]));
  });
}