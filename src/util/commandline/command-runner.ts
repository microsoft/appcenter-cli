// logic that reads a command line, extracts the actual command, and loads it.

import { Command } from "./command";
import { CommandResult, exception, illegal, notFound } from "./command-result";
import * as Finder from "./command-finder";
import * as Loader from "./command-loader";
import { setDebug, isDebug, setFormatJson } from "../interaction";

const debug = require("debug")("sonoma-cli:util:commandline:command-runner");

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
    let newCommand: string[];
    let args: string[];
    try {
      let result = loader(command);

      if (result === null) {
        return notFound(command.join(' '));
      }
      [factory, newCommand, args] = result;
    }
    catch (ex) {
      debug(`Command loading failed, exception = ${ex}`);
      // If we got an exception here, it was an illegal command
      return illegal(command.join(' '));
    }

    try {
      const commandObj = new factory(newCommand, args);
      if (commandObj.debug) {
        setDebug();
      }

      if(commandObj.format) {
        switch(commandObj.format) {
          case null:
          case "":
            break;
          case "json":
            setFormatJson();
            break;

          default:
            throw new Error(`Unknown output format ${commandObj.format}`);
        }
      }

      return await commandObj.run();
    }
    catch (ex) {
      if(isDebug()) {
        console.log(`Command Failure at ${ex.stack}`);
      }
      return exception(command.join(' '), ex);
    }
  }
}

export { runner };
