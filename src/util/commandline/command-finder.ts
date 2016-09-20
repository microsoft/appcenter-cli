// Command dispatcher

import * as path from "path";
import * as fs from "fs";

const debug = require("debug")("sonoma-cli:util:commandline:command-finder");

export class CommandFinder {
  private dispatchRoot: string;

  constructor(rootPath: string) {
    debug(`Creating dispatch for root ${rootPath}`);
    this.dispatchRoot = rootPath;
    if (!this.isDir([])) {
      throw new Error("Invalid dispatch root");
    }
  }

  find(command: string[]): string {
    this.validateCommand(command);
    command = this.normalizeCommandNames(command);

    const commandName = command.slice(-1)[0];
    const commandDir = command.slice(0, -1);

    if (commandDir.length > 0) {
      if (!this.isDir(commandDir)) {
        return null;
      }
    }

    // Have to look through the directory so that we
    // can ignore any potential file extensions.
    const files = fs.readdirSync(this.toFullPath(commandDir));

    const matching = files.filter(file =>
      path.parse(file).name === commandName);

    if (matching.length > 1) {
      throw new Error(`Ambiguous match for command '${command.join(' ')}'`);
    }

    if (matching.length === 0) {
      return null;
    }

    return this.toFullPath(commandDir.concat([matching[0]]));
  }

  private validateCommand(command: string[]): void {
    if (command.length === 0) {
      throw new Error("Missing command name to dispatch");
    }

    if (!command.every(part => this.isLegalCommandName(part))) {
      let err = new Error(`Command '${command.join(' ')}' is illegal`);
      throw err;
    }
  }

  private normalizeCommandNames(command: string[]): string[] {
    return command.map(part => part.toLowerCase());
  }

  private static legalCommandRegex = /^[a-zA-Z0-9_-]+$/;

  private isLegalCommandName(commandName: string): boolean {
    debug(`Checking legality of '${commandName}'`);
    return CommandFinder.legalCommandRegex.test(commandName);
  }

  private isDir(pathParts: string[]): boolean {
    return this.checkStats(pathParts, s => s.isDirectory());
  }

  private isFile(pathParts: string[]): boolean {
    return this.checkStats(pathParts, s => s.isFile());
  }

  private checkStats(pathParts: string[], check: {(stats: fs.Stats): boolean}): boolean {
    try {
      const filePath = this.toFullPath(pathParts);
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

  private toFullPath(pathParts: string[]): string {
    return path.join.apply(null, [this.dispatchRoot].concat(pathParts));
  }
}
