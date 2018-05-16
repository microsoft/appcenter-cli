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
    const commandParts: string[] = findResult.commandParts;
    const args: string[] = findResult.unusedArgs;
    const commandPath = findResult.commandPath;

    if (!findResult.isCategory) {
      // Turn off tslint warning - string is sufficiently validated
      /* tslint:disable-next-line:non-literal-require */
      commandFactory = require(findResult.commandPath).default as typeof Command;
    } else {
      commandFactory = CategoryCommand;
    }

    if (commandFactory === null) {
      debug(`Loaded command from ${findResult.commandPath} but module has no default export`);
    }
    return { commandFactory, commandParts, args, commandPath };
  };
}
