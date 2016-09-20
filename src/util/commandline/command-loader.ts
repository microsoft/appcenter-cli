import { CommandFinder } from "./command-finder";
import { Command } from "./command";

const debug = require("debug")("sonoma-cli:util:commandline:command-loader");


export interface CommandLoader {
  (command: string[]): typeof Command;
}

export function loader(commandFinder: CommandFinder): CommandLoader {
  return function commandLoader(command: string[]): typeof Command {
    const commandPath = commandFinder(command);
    if (commandPath === null) {
      return null;
    }
    const cmd = require(commandPath).default as typeof Command;
    if(cmd === null) {
      debug(`Loaded command from ${commandPath} but module has no default export`);
    }
    return cmd;
  }
}
