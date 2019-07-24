//
// Implementation of token store that reads and writes to the Windows credential store.
// Uses included "creds.exe" program to access the credential store.
//

import * as childProcess from "child_process";
import { Observable, Observer } from "rxjs";
import * as split from "split2";
import * as through from "through2";
import * as path from "path";
import * as parser from "./win-credstore-parser";

import { TokenStore, TokenEntry, TokenKeyType, TokenValueType } from "../token-store";

const debug = require("debug")("appcenter-cli:util:token-store:win32:win-token-store");
import { inspect } from "util";

const credExePath = path.join(__dirname, "../../../../bin/windows/creds.exe");

const targetNamePrefix = "AppCenterCli:target=";
const oldTargetNamePrefix = "MobileCenterCli:target=";

class Prefixer {
  private prefix: string;
  constructor(useOldName: boolean) {
    this.prefix = useOldName ? oldTargetNamePrefix : targetNamePrefix;
  }

  ensurePrefix(targetName: string): string {
    if (targetName.slice(this.prefix.length) !== this.prefix) {
      targetName = this.prefix + targetName;
    }
    return targetName;
  }

  removePrefix(targetName: string): string {
    return targetName.slice(this.prefix.length);
  }

  removePrefixFromCred(cred: any): any {
    if (cred.targetName) {
      cred.targetName = this.removePrefix(cred.targetName);
    }
    return cred;
  }
}

function encodeTokenValueAsHex(token: TokenValueType): string {
  const tokenValueAsString = JSON.stringify(token);
  return Buffer.from(tokenValueAsString, "utf8").toString("hex");
}

function decodeTokenValueFromHex(token: string): TokenValueType {
  return JSON.parse(Buffer.from(token, "hex").toString("utf8"));
}

function credToTokenEntry(cred: any): TokenEntry {
  // Assumes credential comes in with prefixes on target skipped, and
  // Credential object in hexidecimal
  debug(`Converting credential ${inspect(cred)} to TokenEntry`);
  return {
    key: cred.targetName,
    accessToken: decodeTokenValueFromHex(cred.credential)
  };
}

export class WinTokenStore implements TokenStore {
/**
 * list the contents of the credential store, parsing each value.
 *
 * We ignore everything that wasn't put there by us, we look
 * for target names starting with the target name prefix.
 *
 *
 * @return {Observable<TokenEntry>} stream of credentials.
 */
  list(): Observable<TokenEntry> {
    const prefixer = new Prefixer(false);
    return Observable.create((observer: Observer<TokenEntry>) => {
      const credsProcess = childProcess.spawn(credExePath, ["-s", "-g", "-t", `${targetNamePrefix}*`]);

      debug("Creds process started for list, monitoring output");
      const credStream = credsProcess.stdout
        .pipe(parser.createParsingStream())
        .pipe(through.obj(function (chunk: Buffer, enc: any, done: Function) {
          done(null, prefixer.removePrefixFromCred(chunk));
        }));

        credStream.on("data", (cred: any) => {
          debug(`Got data from creds: ${cred}`);
          observer.next(credToTokenEntry(cred));
        });
        credStream.on("end", () => {
          debug(`output list completed`);
          observer.complete();
        });

        credStream.on("error", (err: Error) => observer.error(err));
    });
  }

/**
 * Get details for a specific credential. Assumes generic credential.
 *
 * @param {tokenKeyType} key target name for credential
 * @return {Promise<TokenEntry>} Returned credential or null if not found.
 */
  get(key: TokenKeyType, useOldName: boolean = false): Promise<TokenEntry> {
    const prefixer = new Prefixer(useOldName);
    const args = [ "-s", "-t", prefixer.ensurePrefix(key) ];

    const credsProcess = childProcess.spawn(credExePath, args);
    let result: any = null;
    const errors: string[] = [];

    debug(`Getting key with args ${inspect(args)}`);
    return new Promise<TokenEntry>((resolve, reject) => {
      credsProcess.stdout.pipe(parser.createParsingStream())
        .pipe(through.obj(function (chunk: Buffer, enc: any, done: Function) {
          done(null, prefixer.removePrefixFromCred(chunk));
        }))
        .on("data", (credential: any) => {
          result = credential;
          result.targetName = prefixer.removePrefix(result.targetName);
        });

      credsProcess.stderr.pipe(split())
        .on("data", (line: string) => {
          errors.push(line);
        });

      credsProcess.on("exit", (code: number) => {
        if (code === 0) {
          debug(`Completed getting token, result = ${inspect(result)}`);
          return resolve(credToTokenEntry(result));
        }
        return reject(new Error(`Getting credential failed, exit code ${code}: ${errors.join(", ")}`));
      });
    });
  }

  /**
   * Set the credential for a given key in the credential store.
   * Creates or updates, assumes generic credential.
   *
   * @param {TokenKeyType} key key for entry (string user name for now)
   * @param {TokenValueType} credential the credential to be encrypted
   *
   * @return {Promise<void>} Promise that completes when update has finished
   * @param {Function(err)} callback completion callback
   */
  set(key: TokenKeyType, credential: TokenValueType): Promise<void> {
    const prefixer = new Prefixer(false);
    const args = [ "-a", "-t", prefixer.ensurePrefix(key), "-p", encodeTokenValueAsHex(credential) ];

    debug(`Saving token with args ${inspect(args)}`);
    return new Promise<void>((resolve, reject) => {
      childProcess.execFile(credExePath, args,
        function (err) {
          if (err) {
            debug(`Token store failed, ${inspect(err)}`);
            return reject(err);
          }
          debug(`Token successfully stored`);
          return resolve();
        });
     });
  }

 /**
  * Remove the given key from the credential store.
  *
  * @param {TokenKeyType} key  target name to remove.
  *                            if ends with "*" character,
  *                            will delete all targets
  *                            starting with that prefix
  * @param {Function(err)} callback completion callback
  */
  remove(key: TokenKeyType): Promise<void> {
    const prefixer = new Prefixer(false);
    const args = [ "-d", "-t", prefixer.ensurePrefix(key) ];

    if (key.slice(-1) === "*") {
      args.push("-g");
    }

    debug(`Deleting token with args ${inspect(args)}`);
    return new Promise<void>((resolve, reject) => {
      childProcess.execFile(credExePath, args,
        function (err) {
          if (err) { return reject(err); }
          resolve();
        });
    });
  }
}

export function createWinTokenStore(): TokenStore {
  debug(`Creating WinTokenStore`);
  return new WinTokenStore();
}
