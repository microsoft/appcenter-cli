// Command dispatcher

import * as path from "path";
import * as fs from "fs";
import { inspect } from "util";

const debug = require("debug")("appcenter-cli:util:commandline:command-finder");

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
  } catch (err) {
    if (err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

function stripExtension(name: string): string {
  const extLen = path.extname(name).length;
  if (extLen > 0) {
    return name.slice(0, -extLen);
  }
  return name;
}

function isDir(dispatchRoot: string, pathParts: string[]): boolean {
  return checkStats(dispatchRoot, pathParts, (s) => s.isDirectory());
}

function normalizeCommandNames(command: string[]): string[] {
  return command.map((part) => part.toLowerCase());
}

const legalCommandRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function isLegalCommandName(commandName: string): boolean {
  debug(`Checking legality of '${commandName}'`);
  return legalCommandRegex.test(commandName) && commandName !== "lib";
}

function splitCommandLine(command: string[]): [string[], string[]] {
  let partitionPoint = command.findIndex((cmd) => !isLegalCommandName(cmd));
  if (partitionPoint === -1) {
    partitionPoint = command.length;
  }
  return [command.slice(0, partitionPoint), command.slice(partitionPoint)];
}

export interface CommandFinderResult {
  // was a command path found at all?
  found: boolean;

  // Is this a category rather than a command?
  isCategory: boolean;

  // File path to command to load
  commandPath: string;

  // Parts used to build command path
  commandParts: string[];

  // Args that were not used to build the path.
  unusedArgs: string[];
}

// Helper functions to construct results
function commandNotFound(commandParts: string[]): CommandFinderResult {
  debug(`No command found at '${commandParts.join(" ")}'`);
  return {
    found: false,
    isCategory: false,
    commandPath: null,
    commandParts,
    unusedArgs: []
  };
}

function commandFound(commandPath: string, commandParts: string[], unusedArgs: string[]): CommandFinderResult {
  debug(`Command '${commandParts.join(" ")}' found at ${commandPath}`);
  return {
    found: true,
    isCategory: false,
    commandPath,
    commandParts: commandParts.map(stripExtension),
    unusedArgs
  };
}

function categoryFound(commandPath: string, commandParts: string[], unusedArgs: string[]): CommandFinderResult {
  debug(`Category '${commandParts.join(" ")}' found at ${commandPath}`);
  return {
    found: true,
    isCategory: true,
    commandPath,
    commandParts,
    unusedArgs
  };
}

export interface CommandFinder {
  (command: string[]): CommandFinderResult;
}

export function finder(dispatchRoot: string): CommandFinder {
  if (!isDir(dispatchRoot, [])) {
    throw new Error("Invalid dispatch root");
  }

  return function commandFinder(commandLineArgs: string[]): CommandFinderResult {
    debug(`Looking for command ${inspect(commandLineArgs)}`);
    const [command, args] = splitCommandLine(commandLineArgs);
    if (command.length === 0) {
      return categoryFound(toFullPath(dispatchRoot, []), [], commandLineArgs);
    }

    function findFile(commandDir: string[], commandName: string): [string, string[], boolean] {
      debug(`Looking for '${commandName}' in directory '${toFullPath(dispatchRoot, commandDir)}'`);
      if (commandDir.length > 0 && !isDir(dispatchRoot, commandDir)) {
        return null;
      }

      const fullCommand = commandDir.concat([commandName]);
      if (checkStats(dispatchRoot, fullCommand, (stats) => stats.isDirectory())) {
        return [toFullPath(dispatchRoot, fullCommand), fullCommand, false];
      }

      // Have to look through the directory so that we
      // can ignore any potential file extensions.
      const files = fs.readdirSync(toFullPath(dispatchRoot, commandDir));

      const matching = files.filter((file) =>
        path.parse(file).name === commandName);

      if (matching.length > 1) {
        throw new Error(`Ambiguous match for command '${commandLineArgs.join(" ")}'`);
      }

      if (matching.length === 0) {
        return null;
      }

      const commandParts = commandDir.concat([matching[0]]);
      const commandPath = toFullPath(dispatchRoot, commandDir.concat([matching[0]]));
      return [commandPath, commandParts, true];
    }

    while (command.length > 0) {

      const commandName = normalizeCommandNames(command.slice(-1))[0];
      const commandDir = normalizeCommandNames(command.slice(0, -1));

      const result = findFile(commandDir, commandName);
      if (result !== null) {
        if (result[2]) {
          return commandFound(result[0], result[1], args);
        }
        return categoryFound(result[0], result[1], args);
      }

      // Not found, push the last arg in command name into unused pile.
      args.unshift(command.pop());
      debug(`Not found, unused args = ${args}, new command = ${command}`);
    }

    // Got here, nothing found
    return commandNotFound(commandLineArgs);
  };
}
