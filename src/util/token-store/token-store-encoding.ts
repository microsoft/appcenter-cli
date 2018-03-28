//
// Utility functions used to encode and decode values
// stored in the token cache as keys or values.
//

import * as _ from "lodash";

//
// Replace ':' chars with '\:' and
// replace '\' chars with '\\'
//
export function escape(s: string): string {
  let result = "";
  _.each(s, function (ch) {
    switch (ch) {
      case ":":
        result += "\\:";
        break;
      case "\\":
        result += "\\\\";
        break;
      default:
        result += ch;
    }
  });
  return result;
}

//
// Reverse of escape - converts \: and \\ back
// to their single character equivalents.
//
export function unescape(s: string): string {
  let result = "";
  let afterSlash = false;
  _.each(s, function (ch) {
    if (!afterSlash) {
      if (ch === "\\") {
        afterSlash = true;
      } else {
        result += ch;
      }
    } else {
      result += ch;
      afterSlash = false;
    }
  });

  if (afterSlash) {
    result += "\\";
  }

  return result;
}

export function encodeObject(obj: any): string {
  return _.chain(obj)
    .toPairs()
    .sortBy(function (p) { return p[0]; })
    .map(function (p) {
      if (_.isBoolean(p[1])) {
        return [p[0], p[1].toString()];
      }
      if (_.isDate(p[1])) {
        return [p[0], (p[1] as Date).toISOString()];
      }
      return [p[0], p[1] ? p[1].toString() : ""];
    })
    .map(function (p) { return p.map(escape); })
    .map(function (p) { return p.join(":"); })
    .value()
    .join("::");
}

function endsWith(s: string, ending: string): boolean {
  return s.substring(s.length - ending.length) === ending;
}

function partToKeyValue(part: string): string[] {
  const parts: string[] = part.split(":");
  const value: string[] = parts.reduce(
    (accumulator: string[], value: string, index: number, array: string[]): string[] => {
      if (accumulator[1] !== null && endsWith(accumulator[1], "\\")) {
        accumulator[1] += ":" + value;
      } else if (accumulator[0] === null) {
        accumulator[0] = value;
      } else if (endsWith(accumulator[0], "\\")) {
        accumulator[0] += ":" + value;
      } else {
        accumulator[1] = value;
      }
      return accumulator;
    }, [null, null]);
  return value;
}

export function decodeObject(key: string): any {
  return _.chain(key.split("::"))
    .map(partToKeyValue)
    .map(function (pairs) { return pairs.map(unescape); })
    .fromPairs()
    .value();
}
