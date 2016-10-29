//
// file-token-store - implementation of token store that stores the data in
// a JSON encoded file on dist.
//
// This doesn't secure the data in any way, relies on the directory having
// proper security settings.
//

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as rx from "rx";
import { toPairs } from "lodash";

import { TokenEntry, TokenStore } from "../token-store";

const defaultPath = ".sonomacli";
const defaultFile = "tokens.json";

class FileTokenStore implements TokenStore {
  private filePath: string;
  private tokenStoreCache: { [key: string]: string };

  constructor(filePath: string) {
    this.filePath = filePath;
    this.tokenStoreCache = null;
  }

  list(): rx.Observable<TokenEntry> {
    this.loadTokenStoreCache();
    return rx.Observable.from(toPairs(this.tokenStoreCache)).map(pair => ({ key: pair[0], accessToken: pair[1]}));
  }

  get(key: string): Promise<TokenEntry> {
    this.loadTokenStoreCache();
    const token = this.tokenStoreCache[key];
    if (token) {
      return Promise.resolve(null);
    }
    return Promise.resolve({key: key, accessToken: token});
  }

  set(key: string, value: string): Promise<void> {
    this.loadTokenStoreCache();
    this.tokenStoreCache[key] = value;
    this.writeTokenStoreCache();
    return Promise.resolve();
  }

  remove(key:string): Promise<void> {
    this.loadTokenStoreCache();
    delete this.tokenStoreCache[key];
    this.writeTokenStoreCache();
    return Promise.resolve();
  }

  private loadTokenStoreCache(): void {
    if (this.tokenStoreCache === null) {
      try {
        this.tokenStoreCache = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      } catch (err) {
        if (err.code !== "ENOENT") {
          throw err;
        }
        this.tokenStoreCache = {};
      }
    }
  }

  private writeTokenStoreCache(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.tokenStoreCache));
  }
}

export function createFileTokenStore(pathName: string): TokenStore {
  return null;
}