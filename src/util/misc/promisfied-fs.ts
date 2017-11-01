import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";
import * as rimraf from "rimraf";
import * as temp from "temp";
import * as mkDirP from "mkdirp";

temp.track();

export async function stat(path: string | Buffer): Promise<fs.Stats> {
  return (await callFs(fs.stat, path))[0];
}

export async function open(path: string | Buffer, flags: string | number, mode: number): Promise<number> {
  return (await callFs(fs.open, path, flags, mode))[0];
}

export async function read(fd: number, buffer: Buffer, offset: number, length: number, position: number): Promise<{buffer: Buffer, bytesRead: number}> {
  let result = await callFs(fs.read, fd, buffer, offset, length, position);
  return { bytesRead: result[0], buffer: result[1] };
}

export function readFile(filename: string): Promise<Buffer>;
export function readFile(filename: string, encoding: string): Promise<string>;
export function readFile(filename: string, options: { flag?: string; }): Promise<Buffer>;
export function readFile(filename: string, options?: string | { encoding: string; flag?: string; }): Promise<string>;
export async function readFile(...args: any[]): Promise<any> {
  return (await callFs(fs.readFile, ...args))[0];
};

export async function readdir(path: string | Buffer): Promise<string[]> {
  return (await callFs(fs.readdir, path))[0];
}

export async function writeFile(filename: string, data: any): Promise<void> {
  return (await callFs(fs.writeFile, filename, data))[0];
}

export async function write(fd: number, data: Buffer): Promise<void> {
  return (await callFs(fs.write, fd, data, 0, data.length))[0];
}

export function exists(path: string | Buffer): Promise<boolean> {
   return new Promise((resolve, reject) => {
     fs.stat(path, err => {
       if (err) {
          if (err.code === "ENOENT") {
            resolve(false);
          }
          else {
            reject(err);
          }
       }
       else {
           resolve(true);
       }
     });
 });
}

export function mkdir(path: string | Buffer): Promise<void> {
  return callFs(fs.mkdir, path).then(() => {});
}

export function mkdirp (path: string): Promise<string>;
export function mkdirp (path: string, opts: mkDirP.Opts): Promise<string>;
export function mkdirp (...args: any[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    mkDirP.apply(null, args.concat([(err: Error, made: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(made);
      }
    }]));    
  });
}

export function mkTempDir(affixes: string): Promise<string> {
  return callTemp(temp.mkdir, affixes);
}

export async function cp(source: string, target: string): Promise<void> {
  let sourceStats = await stat(source);
  if (sourceStats.isDirectory()) {
    await cpDir(source, target);
  }
  else {
    await cpFile(source, target);
  }
}

export async function cpDir(source: string, target: string): Promise<void> {
  if (!await exists(target)) {
    await mkdir(target);
  }
  let files = await readdir(source);

  for (let i = 0; i < files.length; i++) {
    let sourceEntry = path.join(source, files[i]);
    let targetEntry = path.join(target, files[i]);

    await cp(sourceEntry, targetEntry);
  }
}

export function cpFile(source: string, target: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let sourceStream = fs.createReadStream(source);
    let targetStream = fs.createWriteStream(target);

    targetStream.on("close", () => resolve());
    targetStream.on("error", (err: any) => reject(err));

    sourceStream.pipe(targetStream);
  });
}

export function rmDir(source: string, recursive: boolean = true): Promise<void> {
  if (recursive) {
    return new Promise<void>((resolve, reject) => {
      rimraf(source, err => {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }
  else {
    return callFs(fs.rmdir, source).then(() => {});
  }
}

export function unlink(filePath: string): Promise<void> {
  return callFs(fs.unlink, filePath).then(() => {});
}

export function close(fd: number): Promise<void> {
  return callFs(fs.close, fd).then(() => {});
}

export function openTempFile(prefix: string): Promise<{path: string, fd: number}>;
export function openTempFile(options: { prefix?: string, suffix?: string, dir?: string}): Promise<{path: string, fd: number}>
export function openTempFile(...args: any[]): Promise<{path: string, fd: number}> {
  return callTemp(temp.open, ...args);
}

 export async function fileExists(path: string): Promise<boolean> {
   return await pathExists(path, true);
 }

export async function directoryExists(path: string): Promise<boolean> {
   return await pathExists(path, false);
 }

export async function access(path: string | Buffer, mode: number): Promise<void> {
  return callFs(fs.access, path, mode).then(() => {});
}

export async function walk(dir: string): Promise<string[]> {
  var results: string[] = [];
  var list: string[] = await readdir(dir);
  list.forEach(async (file: string): Promise<string[]|void> => {
    file = path.join(dir, file);
    var fileStats = await stat(file);
    if (fileStats && fileStats.isDirectory()) results = results.concat(await walk(file));
    else results.push(file);
  });
  return results;
}

async function pathExists(path: string, isFile: boolean): Promise<boolean> {
  let stats: fs.Stats = null;
  
  try {
    stats = await stat(path);
  }
  catch (err) {
    return false;
  }

  return isFile === stats.isFile();
}

function callFs(func: (...args: any[]) => void, ...args: any[]): Promise<any[]> {
  return new Promise<any[]>((resolve, reject) => {
    func.apply(fs, _.concat(args, [
      (err: any, ...args: any[]) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(args);
        }
      }
    ]));
  });
}

function callTemp<TResult>(func: (...args: any[]) => void, ...args: any[]): Promise<TResult> {
  return new Promise<TResult>((resolve, reject) => {
    func.apply(temp, _.concat(args, [
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