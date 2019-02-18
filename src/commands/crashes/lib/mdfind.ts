/**
 * Node module for searching OSX Spotlight, using the built-in mdfind shell command.
 * Forked from brandonhorst/node-mdfind github repo, because original npm package contains insecure dependencies.
 * {@link https://github.com/brandonhorst/node-mdfind/blob/master/src/index.js Original js file}
 */

const _ = require("lodash");
import { spawn } from "child_process";
import * as split from "split2";
import * as through from "through2";

interface IMdfindParameters {
  query?: string;
  attributes?: object[];
  names?: object[];
  directories?: object[];
  live?: boolean;
  interpret?: boolean;
  limit?: number;
}

export function mdfind({ query = null, attributes = [], names = [], directories = [], live = false, interpret = false, limit = null }: IMdfindParameters = {}) {
  const dirArgs = makeArgs(directories, "-onlyin");
  const nameArgs = makeArgs(names, "-name");
  const attrArgs = makeArgs(attributes, "-attr");
  const interpretArgs = interpret ? ["-interpret"] : [];
  const queryArgs = query ? [query] : [];

  const args = ["-0"].concat(dirArgs, nameArgs, attrArgs, interpretArgs, live ? ["-live", "-reprint"] : [], queryArgs);

  const child = spawn("mdfind", args);
  const jsonify = _.partial(extractData, attributes);

  let times = 0;

  return {
    /* tslint:disable:no-octal-literal */
    output: child.stdout
      .pipe(split("\0"))
      .pipe(through(filterEmpty))
      .pipe(through(function (data, enc, done) {
        times++;
        if (limit && times === limit) {
          child.kill();
        }

        if (limit && times > limit) {
          return done();
        }
        done(null, data);
      }))
      .pipe(through(jsonify)),
    terminate: () => child.kill()
  };
}

function extractData(attrs: any, line: string, enc: any, done: Function) {
  const splitLine = [line];
  for (const attr of attrs) {
    const lastBit = splitLine[splitLine.length - 1];
    const searchFor = `   ${attr} = `;
    const thisIndex = lastBit.indexOf(searchFor);
    if (thisIndex === -1) {
      console.log(`Something went wrong with Spotlight Source - line: ${line} - attr: ${attr}`);
      return done(null, {});
    }
    const endIndex = thisIndex + searchFor.length;

    splitLine.splice(splitLine.length - 1, 1, lastBit.substring(0, thisIndex), lastBit.substring(endIndex));
  }

  const adjustedLine = splitLine.map(getItem);

  const keys = ["kMDItemPath"].concat(attrs);
  const result = _.zipObject(keys, adjustedLine);
  done(null, result);
}

function getItem(item: string) {
  if (item === "(null)") {
    return null;
  } else if (_.startsWith(item, '(\n    "') && _.endsWith(item, '"\n)')) {
    const actual = item.slice(7, -3);
    const lines = actual.split('",\n    "');
    return lines;
  } else {
    return item;
  }
}

function filterEmpty(data: string, enc: any, done: Function) {
  if (data === "") {
    done();
  } else {
    done(null, data);
  }
}

function makeArgs(array: object[], argName: string) {
  return _.chain(array)
    .map((item: object) => { return [argName, item]; })
    .flatten()
    .value();
}
