// logic that reads a command line, extracts the actual command, and loads it.

import { Command } from "./command";
import { CommandResult, exception, illegal, notFound, isCommandFailedResult } from "./command-result";
import * as Finder from "./command-finder";
import * as Loader from "./command-loader";
import { isDebug } from "../interaction";

const debug = require("debug")("appcenter-cli:util:commandline:command-runner");
import { inspect } from "util";

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
    loader = arg as Loader.CommandLoader;
  }

  return async function commandRunner(command: string[]): Promise<CommandResult> {
    let factory: typeof Command;
    let newCommand: string[];
    let args: string[];
    let commandPath: string;
    try {
      debug(`Loading command ${command}`);
      const result = loader(command);
      debug(`Command loading completed, result = ${inspect(result)}`);

      if (result === null) {
        return notFound(command.join(" "));
      }
      ({ commandFactory: factory, commandParts: newCommand, args, commandPath } = result);
    } catch (ex) {
      debug(`Command loading failed, exception = ${ex}`);
      // If we got an exception here, it was an illegal command
      return illegal(command.join(" "));
    }

    try {
      const commandObj = new factory({ command: newCommand, args, commandPath });
      return await commandObj.execute();
    } catch (ex) {
      if (isCommandFailedResult(ex)) {
        return ex;
      }
      if (isDebug()) {
        console.log(`Command Failure at ${ex.stack}`);
      }
      return exception(command.join(" "), ex);
    }
  };
}

export { runner };
