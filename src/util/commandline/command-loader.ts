import { CommandFinder } from "./command-finder";
import { Command } from "./command";
import { CategoryCommand } from "./category-command";

const debug = require("debug")("sonoma-cli:util:commandline:command-loader");


export interface CommandLoader {
  (command: string[]): [typeof Command, string[], string[]];
}

export function loader(commandFinder: CommandFinder): CommandLoader {
  return function commandLoader(command: string[]): [typeof Command, string[], string[]] {
    const findResult = commandFinder(command);
    if (!findResult.found) {
      return null;
    }
    let cmd: typeof Command;
    let commandParts: string[] = findResult.commandParts;
    let args: string[] = findResult.unusedArgs;;
    if (!findResult.isCategory) {
      cmd = require(findResult.commandPath).default as typeof Command;
    } else {
      cmd = CategoryCommand;
    }

    if(cmd === null) {
      debug(`Loaded command from ${findResult.commandPath} but module has no default export`);
    }
    return [cmd, commandParts, args];
  }
}
