/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

//
// Parser for the output of the security(1) command line.
//

import * as _ from "lodash";
import * as Pumpify from "pumpify";
import * as split from "split2";
import * as stream from "stream";

const debug = require("debug")("appcenter-cli:util:token-store:osx:osx-keychain-parser");

//
// Regular expressions that match the various fields in the input
//

// Fields at the root - not attributes
const rootFieldRe = /^([^: \t]+):(?: (?:"([^"]+)")|(.*))?$/;

// Attribute values, this gets a little more complicated
const attrRe = /^    (?:(0x[0-9a-fA-F]+) |"([a-z]{4})")<[^>]+>=(?:(<NULL>)|"([^"]+)"|(0x[0-9a-fA-F]+)(?:  "([^"]+)")|(.*)?)/;

//
// Stream based parser for the OSX security(1) program output.
// Implements a simple state machine. States are:
//
//   0 - Waiting for the initial "keychain" string.
//   1 - Waiting for the "attributes" string. adds any properties to the
//       current entry object being parsed while waiting.
//   2 - reading attributes. Continues adding the attributes to the
//       current entry object until we hit either a non-indented line
//       or end. At which point we emit.
//

export class OsxSecurityParsingStream extends stream.Transform {
  currentEntry: any;
  inAttributes: boolean;

  constructor() {
    super({objectMode: true});
    this.currentEntry = null;
    this.inAttributes = false;
  }

  _transform(chunk: any, encoding: string, callback: {(err?: Error): void}): void {
    const line = chunk.toString();

    debug(`Parsing line [${line}]`);

    const rootMatch = line.match(rootFieldRe);
    if (rootMatch) {
      this.processRootLine(rootMatch[1], rootMatch[2] || rootMatch[3]);
    } else {
      const attrMatch = line.match(attrRe);
      if (attrMatch) {
        // Did we match a four-char named field? We don't care about hex fields
        if (attrMatch[2]) {
          // We skip nulls, and grab text rather than hex encoded versions of value
          const value = attrMatch[6] || attrMatch[4];
          if (value) {
            this.processAttributeLine(attrMatch[2], value);
          }
        }
      }
    }
    callback();
  }

  _flush(callback: {(err?: Error): void}): void {
    this.emitCurrentEntry();
    callback();
  }

  emitCurrentEntry(): void {
    if (this.currentEntry) {
      this.push(this.currentEntry);
      this.currentEntry = null;
    }
  }

  processRootLine(key: string, value: string): void {
    debug(`matched root line`);
    if (this.inAttributes) {
      debug(`was in attributes, emitting`);
      this.emitCurrentEntry();
      this.inAttributes = false;
    }
    if (key === "attributes") {
      debug(`now in attributes`);
      this.inAttributes = true;
    } else {
      debug(`adding root attribute ${key} with value ${value} to object`);
      this.currentEntry = this.currentEntry || {};
      this.currentEntry[key] = value;
    }
  }

  processAttributeLine(key: string, value: string): void  {
    debug(`adding attribute ${key} with value ${value} to object`);
    this.currentEntry[key] = value;
  }
}

export function createOsxSecurityParsingStream(): NodeJS.ReadWriteStream {
  return new Pumpify.obj(split(), new OsxSecurityParsingStream());
}
