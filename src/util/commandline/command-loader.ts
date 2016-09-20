import { CommandFinder } from "./command-finder";
import { Command } from "./command";

const debug = require("debug")("sonoma-cli:util:commandline:command-loader");

export class CommandLoader {
  private finder: CommandFinder

  constructor(finder: CommandFinder) {
    this.finder = finder;
  }

  load(command: string[]): Command {
    const commandPath = this.finder.find(command);
    if (commandPath === null) {
      return null;
    }
    const cmd = require(commandPath).default as Command;
    if(cmd === null) {
      debug(`Loaded command from ${commandPath} but module has no default export`);
    }
    return cmd;
  }
}
