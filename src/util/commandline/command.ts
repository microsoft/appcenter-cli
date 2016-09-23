// Base class for all command handlers
import * as Result from "./command-result";
import { getOptionsDescription, getPositionalOptionsDescription } from "./option-decorators";
import { OptionsDescription, PositionalOptionsDescription, parseOptions } from "./option-parser";

export class Command {
  constructor(command: string[]) {
    const proto = Object.getPrototypeOf(this);
    const flags = getOptionsDescription(proto);
    const positionals = getPositionalOptionsDescription(proto);
    parseOptions(flags, positionals, this, command);
  }

  run(): Promise<Result.CommandResult> {
    throw new Error("Dev error, should be overridden!");
  }
}
