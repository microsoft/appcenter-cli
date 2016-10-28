//
// file-token-store - implementation of token store that stores the data in
// a JSON encoded file on dist.
//
// This doesn't secure the data in any way, relies on the directory having
// proper security settings.
//

import * as os from "os";
import * as path from "path";
import * as rx from "rx";

import { TokenEntry, TokenStore } from "../token-store";

const defaultPath = ".sonomacli";
const defaultFile = "tokens.json";

class FileTokenStore implements TokenStore {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  list(): rx.Observable<TokenEntry> {
    return rx.Observable.from([]);
  }

  get(key: string): Promise<TokenEntry> {
    return Promise.resolve(null);
  }

  set(key: string, value: string): Promise<void> {
    return Promise.resolve();
  }

  remove(key:string): Promise<void> {
    return Promise.resolve();
  }
}

export function createFileTokenStore(pathName: string): TokenStore {
  return null;
}