/**
 * NOTE!!! This utility file is duplicated for use by the CodePush service (for server-driven hashing/
 * integrity checks) and Management SDK (for end-to-end code signing), please keep them in sync.
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as path from "path";
import * as stream from "stream";

// Do not throw an exception if either of these modules are missing, as they may not be needed by the
// consumer of this file.
const HASH_ALGORITHM = "sha256";

export async function generatePackageHashFromDirectory(directoryPath: string, basePath: string): Promise<string> {
  if (!(await pfs.stat(directoryPath)).isDirectory()) {
    throw new Error("Not a directory. Please either create a directory, or use hashFile().");
  }

  const manifest: PackageManifest = await generatePackageManifestFromDirectory(directoryPath, basePath);
  return await manifest.computePackageHash();
}

export async function generatePackageManifestFromDirectory(directoryPath: string, basePath: string): Promise<PackageManifest> {
  return new Promise<PackageManifest>(async (resolve, reject) => {
    let fileHashesMap = new Map<string, string>();

    const files: string[] = await pfs.walk(directoryPath);

    if (!files || files.length === 0) {
      reject("Error: Can't sign the release because no files were found.");
      return;
    }

    // Hash the files sequentially, because streaming them in parallel is not necessarily faster
    let generateManifestPromise: Promise<void> = files.reduce((soFar: Promise<void>, filePath: string) => {
      return soFar
        .then(() => {
          let relativePath: string = PackageManifest.normalizePath(path.relative(basePath, filePath));
          if (!PackageManifest.isIgnored(relativePath)) {
            return hashFile(filePath)
              .then((hash: string) => {
                fileHashesMap.set(relativePath, hash);
              });
          }
        });
    }, Promise.resolve(<void>null));

    generateManifestPromise
      .then(() => {
        resolve(new PackageManifest(fileHashesMap));
      }, reject)
  })
}

export async function hashFile(filePath: string): Promise<string> {
  let readStream: fs.ReadStream = fs.createReadStream(filePath);
  return hashStream(readStream);
}

export async function hashStream(readStream: stream.Readable): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let hashStream = <stream.Transform><any>crypto.createHash(HASH_ALGORITHM);

    readStream
      .on("error", (error: any): void => {
        hashStream.end();
        reject(error);
      })
      .on("end", (): void => {
        hashStream.end();

        let buffer = <Buffer>hashStream.read();
        let hash: string = buffer.toString("hex");

        resolve(hash);
      });

    readStream.pipe(hashStream);
  })
}

export class PackageManifest {
  private _map: Map<string, string>;

  public constructor(map?: Map<string, string>) {
    if (!map) {
      map = new Map<string, string>();
    }
    this._map = map;
  }

  public toMap(): Map<string, string> {
    return this._map;
  }

  public async computePackageHash(): Promise<string> {
    let entries: string[] = [];
    this._map.forEach((hash: string, name: string): void => {
      entries.push(name + ":" + hash);
    });

    // Make sure this list is alphabetically ordered so that other clients
    // can also compute this hash easily given the update contents.
    entries = entries.sort();

    return Promise.resolve(
      crypto.createHash(HASH_ALGORITHM)
        .update(JSON.stringify(entries))
        .digest("hex")
    );
  }

  public serialize(): string {
    let obj: any = {};

    this._map.forEach(function (value, key) {
      obj[key] = value;
    });

    return JSON.stringify(obj);
  }

  public static deserialize(serializedContents: string): PackageManifest {
    try {
      let obj: any = JSON.parse(serializedContents);
      let map = new Map<string, string>();

      for (let key of Object.keys(obj)) {
        map.set(key, obj[key]);
      }

      return new PackageManifest(map);
    } catch (e) {
    }
  }

  public static normalizePath(filePath: string): string {
    //replace all backslashes coming from cli running on windows machines by slashes
    return filePath.replace(/\\/g, "/");
  }

  public static isIgnored(relativeFilePath: string): boolean {
    const __MACOSX = "__MACOSX/";
    const DS_STORE = ".DS_Store";
    const CODEPUSH_METADATA = ".codepushrelease";
    return startsWith(relativeFilePath, __MACOSX)
      || relativeFilePath === DS_STORE
      || endsWith(relativeFilePath, "/" + DS_STORE)
      || relativeFilePath === CODEPUSH_METADATA
      || endsWith(relativeFilePath, "/" + CODEPUSH_METADATA);
  }
}

function startsWith(str: string, prefix: string): boolean {
  return str && str.substring(0, prefix.length) === prefix;
}

function endsWith(str: string, suffix: string): boolean {
  return str && str.indexOf(suffix, str.length - suffix.length) !== -1;
}
