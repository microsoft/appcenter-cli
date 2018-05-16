// Token store implementation over OSX keychain

//
// Access to the OSX keychain - list, add, get password, remove
//
import * as _ from "lodash";
import * as rx from "rx-lite";
import * as childProcess from "child_process";
import * as es from "event-stream";
import * as stream from "stream";

import { TokenStore, TokenEntry, TokenKeyType, TokenValueType } from "../token-store";
import { createOsxSecurityParsingStream, OsxSecurityParsingStream } from "./osx-keychain-parser";

const debug = require("debug")("appcenter-cli:util:token-store:osx:osx-token-store");
import { inspect } from "util";

const securityPath = "/usr/bin/security";
const serviceName = "appcenter-cli";
const oldServiceName = "mobile-center-cli";

export class OsxTokenStore implements TokenStore {
  list(): rx.Observable<TokenEntry> {

    return rx.Observable.create((observer: rx.Observer<TokenEntry>) => {
      const securityProcess = childProcess.spawn(securityPath, ["dump-keychain"]);

      const securityStream = securityProcess.stdout
        .pipe(es.split() as any as stream.Duplex)
        .pipe(es.mapSync(function (line: string) {
          return line.replace(/\\134/g, "\\");
        }) as any as stream.Duplex)
        .pipe(new OsxSecurityParsingStream());

      securityStream.on("data", (data: any) => {
        debug(`listing, got data ${inspect(data)}`);
        if (data.svce !== serviceName) {
          debug(`service does not match, skipping`);
          return;
        }

        const key: TokenKeyType = data.acct;
        // Have to get specific token to get tokens, but we have ids
        const accessToken: TokenValueType = {
          id: data.gena,
          token: null
        };
        debug(`Outputting ${inspect({ key, accessToken })}`);
        observer.onNext({ key, accessToken });
      });
      securityStream.on("end", (err: Error) => {
        debug(`output from security program complete`);
        if (err) { observer.onError(err); } else { observer.onCompleted(); }
      });
    });
  }

  get(key: TokenKeyType, useOldName: boolean = false): Promise<TokenEntry> {
    const args = [
      "find-generic-password",
      "-a", key,
      "-s", useOldName ? oldServiceName : serviceName,
      "-g"
    ];

    return new Promise<TokenEntry>((resolve, reject) => {
      resolve = _.once(resolve);
      reject = _.once(reject);

      childProcess.execFile(securityPath, args, (err: Error, stdout: string, stderr: string) => {
        if (err) { return reject(err); }
        const match = /^password: (?:0x[0-9A-F]+. )?"(.*)"$/m.exec(stderr);
        if (match) {
          const accessToken = match[1].replace(/\\134/g, "\\");

          debug(`stdout for security program = "${stdout}"`);
          debug(`parsing stdout`);
          // Parse the rest of the information from stdout to get user & token ID
          const source = es.through();
          const parsed = source
            .pipe(createOsxSecurityParsingStream());
          parsed.on("data", (data: any) => {
            debug(`got data on key lookup: ${inspect(data)}`);
            resolve({
              key: data.acct,
              accessToken: {
                id: data.gena,
                token: accessToken
              }
            });
          });
          parsed.on("error", (err: Error) => {
            debug(`parsed string failed`);
            reject(err);
          });
          debug(`Pushing output into parsing stream`);
          source.push(stdout);
          source.push(null);
        } else {
          reject(new Error("Password in incorrect format"));
        }
      });
    });
  }

  set(key: TokenKeyType, value: TokenValueType): Promise<void> {
    const args = [
      "add-generic-password",
      "-a", key,
      "-D", "appcenter cli password",
      "-s", serviceName,
      "-w", value.token,
      "-U"
    ];

    if (value.id) { args.push("-G", value.id); }

    return new Promise<void>((resolve, reject) => {
      childProcess.execFile(securityPath, args, function (err, stdout, stderr) {
        if (err) {
          return reject(new Error("Could not add password to keychain: " + stderr));
        }
        return resolve();
      });
    });
  }

  remove(key: TokenKeyType): Promise<void> {
    const args = [
      "delete-generic-password",
      "-a", key,
      "-s", serviceName
    ];

    return new Promise<void>((resolve, reject) => {
      childProcess.execFile(securityPath, args, function (err, stdout, stderr) {
        if (err) {
          return reject(new Error("Could not remove account from keychain, " + stderr));
        }
        return resolve();
      });
    });
  }
}

export function createOsxTokenStore(): TokenStore {
  return new OsxTokenStore();
}
