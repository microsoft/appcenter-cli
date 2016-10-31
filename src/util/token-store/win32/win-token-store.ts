//
// Implementation of token store that reads and writes to the Windows credential store.
// Uses included "creds.exe" program to access the credential store.
//

//
// Wrapper module around Windows credential store.
// Uses the creds.exe program.
//

import * as _ from "lodash";
import * as childProcess from "child_process";
import * as es from "event-stream";
import * as path from "path";
import * as parser from "./win-credstore-parser";

type ReadableStream = NodeJS.ReadableStream;
type WritableStream = NodeJS.WritableStream;
type ReadWriteStream = NodeJS.ReadWriteStream;

var credExePath = path.join(__dirname, '../../../bin/windows/creds.exe');

var targetNamePrefix = 'AzureXplatCli:target=';

function ensurePrefix(targetName: string): string {
  if (targetName.slice(targetNamePrefix.length) !== targetNamePrefix) {
    targetName = targetNamePrefix + targetName;
  }
  return targetName;
}

function removePrefix(targetName: string): string {
  return targetName.slice(targetNamePrefix.length);
}

/**
 * list the contents of the credential store, parsing each value.
 *
 * We ignore everything that wasn't put there by us, we look
 * for target names starting with the target name prefix.
 *
 *
 * @return {Stream} object mode stream of credentials.
 */
function list(): ReadableStream {
  var credsProcess = childProcess.spawn(credExePath,['-s', '-g', '-t', targetNamePrefix + '*']);
  return credsProcess.stdout
    .pipe(parser.createParsingStream() as any as ReadWriteStream)
    .pipe(es.mapSync(function (cred: any): any {
      cred.targetName = removePrefix(cred.targetName);
      return cred;
    }) as any as WritableStream) as any as ReadableStream;
}

/**
 * Get details for a specific credential. Assumes generic credential.
 *
 * @param {string} targetName target name for credential
 * @param {function (err, credential)} callback callback function that receives
 *                                              returned credential.
 */
function get(targetName: string, callback: {(err: Error, credential?: any): void}): void {
  var args = [
    '-s',
    '-t', ensurePrefix(targetName)
  ];

  var credsProcess = childProcess.spawn(credExePath, args);
  var result: any = null;
  var errors: string[] = [];

  credsProcess.stdout.pipe(parser.createParsingStream())
    .on('data', function (credential: any): void {
      result = credential;
      result.targetName = removePrefix(result.targetName);
    });

  credsProcess.stderr.pipe(es.split() as any as WritableStream)
    .on('data', function (line: string): void {
      errors.push(line);
    });

  credsProcess.on('exit', function (code: number): void {
    if (code === 0) {
      callback(null, result);
    } else {
      callback(new Error(`Getting credential failed, exit code ${code}: ${errors.join(', ')}`));
    }
  });
}

/**
 * Set the credential for a given key in the credential store.
 * Creates or updates, assumes generic credential.
 * If credential is buffer, stores buffer contents as binary directly.
 * If credential is string, stores UTF-8 encoded binary.
 *
 * @param {String} targetName target name for entry
 * @param {Buffer|String} credential the credential
 * @param {Function(err)} callback completion callback
 */
 function set(targetName: string, credential: Buffer | string, callback: {(err: Error): void}): void {
  if (_.isString(credential)) {
    credential = new Buffer(credential, 'utf8');
  }
  var args = [
    '-a',
    '-t', ensurePrefix(targetName),
    '-p', credential.toString('hex')
  ];

  childProcess.execFile(credExePath, args,
    function (err) {
      callback(err);
    });
 }

 /**
  * Remove the given key from the credential store.
  *
  * @param {string} targetName target name to remove.
  *                            if ends with "*" character,
  *                            will delete all targets
  *                            starting with that prefix
  * @param {Function(err)} callback completion callback
  */
function remove(targetName: string, callback: {(err: Error): void}): void {
  var args = [
    '-d',
    '-t', ensurePrefix(targetName)
  ];

  if (targetName.slice(-1) === '*') {
    args.push('-g');
  }

  childProcess.execFile(credExePath, args,
    function (err) {
      callback(err);
    });
}

_.extend(exports, {
  list: list,
  set: set,
  get: get,
  remove: remove
});
