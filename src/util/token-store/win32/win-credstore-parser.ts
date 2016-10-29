//
// Parser for the output of the creds.exe helper program.
//

import { pipeline, split } from "event-stream";
import { Transform } from "stream";

//
// Regular expression to match the various fields in the input.
//

const fieldRe = /^([^:]+):\s(.*)$/;

//
// Convert space separated pascal caps ("Target Type")
// to camel case no spaces ("targetType"). Used to Convert
// field names to property names.
//
function fieldNameToPropertyName(fieldName: string): string {
  let parts = fieldName.split(" ");
  parts[0] = parts[0].toLowerCase();
  return parts.join("");
}

//
// Simple streaming parser. It's in one of two states:
// 0 - Waiting for an entry
// 1 - in an entry
//
// At the ending blank line (each entry has one) we output
// the accumulated object.
//

class WinCredStoreParsingStream extends Transform {
  currentEntry: any;

  constructor() {
    super({objectMode: true});
    this.currentEntry = null;
  }

  _transform(chunk: any, encoding: string, callback: {(err?: Error): void}): void {

    let line = chunk.toString();
    let count = 0;

    while (line !== null) {
      ++count;
      if (count > 2) {
        return callback(new Error(`Multiple passes attempting to parse line ${line}. Possible bug in parser and infinite loop`));
      }

      if (this.currentEntry === null) {
        if (line !== "") {
          this.currentEntry = {};
          // Loop back around to process this line
          continue;
        }
        // Skip blank lines between items.
        line = null;
      }

      if (this.currentEntry) {
        if (line !== "") {
          let match = fieldRe.exec(line);
          let key = fieldNameToPropertyName(match[1]);
          let value = match[2];
          this.currentEntry[key] = value;
          line = null;
        } else {
          // Blank line ends an entry
          this.currentEntry = null;
          line = null;
        }
      }
    }

    callback();
  }

  _flush(callback: {(err?: Error): void}): void {
    if (this.currentEntry) {
      this.push(this.currentEntry);
      this.currentEntry = null;
    }
    callback();
  }
}

function createParsingStream() {
  return pipeline(split(), new WinCredStoreParsingStream());
}

namespace createParsingStream {
  export let ParsingStream = WinCredStoreParsingStream;
}

export { createParsingStream };