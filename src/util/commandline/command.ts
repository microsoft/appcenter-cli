// Base class for all command handlers
import * as Result from "./command-result";
import { longName, getOptionsDescription, getPositionalOptionsDescription } from "./option-decorators";
import { OptionsDescription, PositionalOptionsDescription, parseOptions } from "./option-parser";

export class Command {
  constructor(command: string[]) {
    const proto = Object.getPrototypeOf(this);
    const flags = getOptionsDescription(proto);
    const positionals = getPositionalOptionsDescription(proto);
    parseOptions(flags, positionals, this, command);
  }

  // Default arguments supported by every command
  
  @longName("debug")
  public debug: boolean;

  run(): Promise<Result.CommandResult> {
    throw new Error("Dev error, should be overridden!");
  }
}
