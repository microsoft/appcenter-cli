import { CommandFinder } from "./command-finder";
import { Command } from "./command";
import { CategoryCommand } from "./category-command";

const debug = require("debug")("appcenter-cli:util:commandline:command-loader");

export interface LoaderResult {
  commandFactory: typeof Command;
  commandParts: string[];
  args: string[];
  commandPath: string;
}

export interface CommandLoader {
  (command: string[]): LoaderResult;
}

export function loader(commandFinder: CommandFinder): CommandLoader {
  return function commandLoader(command: string[]): LoaderResult {
    const findResult = commandFinder(command);
    if (!findResult.found) {
      return null;
    }
    let commandFactory: typeof Command;
    let commandParts: string[] = findResult.commandParts;
    let args: string[] = findResult.unusedArgs;
    let commandPath = findResult.commandPath;

    if (!findResult.isCategory) {
      commandFactory = require(findResult.commandPath).default as typeof Command;
    } else {
      commandFactory = CategoryCommand;
    }

    if(commandFactory === null) {
      debug(`Loaded command from ${findResult.commandPath} but module has no default export`);
    }
    return { commandFactory, commandParts, args, commandPath };
  }
}
