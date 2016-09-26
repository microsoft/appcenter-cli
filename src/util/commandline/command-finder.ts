// Command dispatcher

import * as path from "path";
import * as fs from "fs";

const debug = require("debug")("sonoma-cli:util:commandline:command-finder");

// Helpers for file system checks

function toFullPath(dispatchRoot: string, pathParts: string[]): string {
  return path.join.apply(null, [dispatchRoot].concat(pathParts));
}

function checkStats(dispatchRoot: string, pathParts: string[], check: {(stats: fs.Stats): boolean}): boolean {
  try {
    const filePath = toFullPath(dispatchRoot, pathParts);
    debug(`Checking stats for ${filePath}`);
    const stats = fs.statSync(filePath);
    return check(stats);
  }
  catch(err) {
    if (err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

function isDir(dispatchRoot: string, pathParts: string[]): boolean {
  return checkStats(dispatchRoot, pathParts, s => s.isDirectory());
}

function isFile(dispatchRoot: string, pathParts: string[]): boolean {
  return checkStats(dispatchRoot, pathParts, s => s.isFile());
}

function normalizeCommandNames(command: string[]): string[] {
  return command.map(part => part.toLowerCase());
}

const legalCommandRegex = /^[a-zA-Z0-9_-]+$/;

function isLegalCommandName(commandName: string): boolean {
  debug(`Checking legality of '${commandName}'`);
  return legalCommandRegex.test(commandName);
}

function splitCommandLine(command: string[]): [string[], string[]] {
  let partitionPoint = command.findIndex(cmd => !isLegalCommandName(cmd));
  if (partitionPoint === -1) {
    partitionPoint = command.length;
  }
  return [command.slice(0, partitionPoint), command.slice(partitionPoint)];
}

export interface CommandFinderResult {
  // File path to command to load
  commandPath: string;

  // Args that were not used to build the path.
  unusedArgs: string[];
}

export interface CommandFinder {
  (command: string[]): CommandFinderResult;
}

export function finder(dispatchRoot: string): CommandFinder {
  if (!isDir(dispatchRoot, [])) {
    throw new Error("Invalid dispatch root");
  }

  return function commandFinder(commandLineArgs: string[]): CommandFinderResult {
    let [command, args] = splitCommandLine(commandLineArgs);
    if (command.length === 0) {
      throw new Error("Missing command name to dispatch");
    }

    function findFile(commandDir: string[], commandName: string): string {
      debug(`Looking for '${commandName}' in directory '${toFullPath(dispatchRoot, commandDir)}'`);
      if (commandDir.length > 0 && !isDir(dispatchRoot, commandDir)) {
        return null;
      }
      // Have to look through the directory so that we
      // can ignore any potential file extensions.
      const files = fs.readdirSync(toFullPath(dispatchRoot, commandDir));

      const matching = files.filter(file =>
        path.parse(file).name === commandName);

      if (matching.length > 1) {
        throw new Error(`Ambiguous match for command '${commandLineArgs.join(' ')}'`);
      }

      if (matching.length === 0) {
        return null;
      }

      return toFullPath(dispatchRoot, commandDir.concat([matching[0]]));
    }

    while (command.length > 0) {

      const commandName = normalizeCommandNames(command.slice(-1))[0];
      const commandDir = normalizeCommandNames(command.slice(0, -1));

      const result = findFile(commandDir, commandName);
      if (result !== null) {
        return { commandPath: result, unusedArgs: args };
      }

      // Not found, push the last arg in command name into unused pile.
      args.unshift(command.pop());
      debug(`Not found, unused args = ${args}, new command = ${command}`);
    }

    // Got here, nothing found
    return null;
  }
}
