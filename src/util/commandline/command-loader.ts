import { CommandFinder } from "./command-finder";
import { Command } from "./command";

const debug = require("debug")("sonoma-cli:util:commandline:command-loader");


export interface CommandLoader {
  (command: string[]): typeof Command;
}

export function loader(commandFinder: CommandFinder): CommandLoader {
  return function commandLoader(command: string[]): typeof Command {
    const findResult = commandFinder(command);
    if (findResult === null) {
      return null;
    }
    const cmd = require(findResult.commandPath).default as typeof Command;
    if(cmd === null) {
      debug(`Loaded command from ${findResult.commandPath} but module has no default export`);
    }
    return cmd;
  }
}
