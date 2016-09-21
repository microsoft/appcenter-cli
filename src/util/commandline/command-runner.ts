// logic that reads a command line, extracts the actual command, and loads it.

import { Command } from "./command";
import { CommandResult, exception, illegal, notFound } from "./command-result";
import * as Finder from "./command-finder";
import * as Loader from "./command-loader";

export interface CommandRunner {
  (command: string[]): Promise<CommandResult>;
}

function runner(loader: Loader.CommandLoader): CommandRunner;
function runner(dispatchRoot: string): CommandRunner;
function runner(arg: any): CommandRunner {
  let loader: Loader.CommandLoader;
  if (typeof arg === "string") {
    loader = Loader.loader(Finder.finder(arg));
  } else {
    loader = <Loader.CommandLoader>arg;
  }

  return async function commandRunner(command: string[]): Promise<CommandResult> {
    // TODO: Parse out the actual command string
    let factory: typeof Command;
    try {
      factory = loader(command);

      if (factory === null) {
        return notFound(command.join(' '));
      }
    }
    catch (ex) {
      // If we got an exception here, it was an illegal command
      return illegal(command.join(' '));
    }

    try {
      const commandObj = new factory(command);

      return await commandObj.run();
    }
    catch (ex) {
      return exception(command.join(' '), ex);
    }
  }
}

export { runner };