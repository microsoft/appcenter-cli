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

// Command validation and normalization
function validateCommand(command: string[]): void {
  if (command.length === 0) {
    throw new Error("Missing command name to dispatch");
  }

  if (!command.every(part => isLegalCommandName(part))) {
    let err = new Error(`Command '${command.join(' ')}' is illegal`);
    throw err;
  }
}

function normalizeCommandNames(command: string[]): string[] {
  return command.map(part => part.toLowerCase());
}

const legalCommandRegex = /^[a-zA-Z0-9_-]+$/;

function isLegalCommandName(commandName: string): boolean {
  debug(`Checking legality of '${commandName}'`);
  return legalCommandRegex.test(commandName);
}

export interface CommandFinder {
  (command: string[]): string;
}

export function finder(dispatchRoot: string): CommandFinder {
  if (!isDir(dispatchRoot, [])) {
    throw new Error("Invalid dispatch root");
  }

  return function commandFinder(command: string[]):string {
    validateCommand(command);
    command = normalizeCommandNames(command);

    const commandName = command.slice(-1)[0];
    const commandDir = command.slice(0, -1);

    if (commandDir.length > 0) {
      if (!isDir(dispatchRoot, commandDir)) {
        return null;
      }
    }

    // Have to look through the directory so that we
    // can ignore any potential file extensions.
    const files = fs.readdirSync(toFullPath(dispatchRoot, commandDir));

    const matching = files.filter(file =>
      path.parse(file).name === commandName);

    if (matching.length > 1) {
      throw new Error(`Ambiguous match for command '${command.join(' ')}'`);
    }

    if (matching.length === 0) {
      return null;
    }

    return toFullPath(dispatchRoot, commandDir.concat([matching[0]]));
  };
}
