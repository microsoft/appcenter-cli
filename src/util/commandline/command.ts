// Base class for all command handlers
import * as Result from "./command-result";
import { shortName, longName, help, hasArg, getOptionsDescription, getPositionalOptionsDescription } from "./option-decorators";
import { OptionsDescription, PositionalOptionsDescription, parseOptions } from "./option-parser";

export class Command {
  constructor(command: string[], args: string[]) {
    const proto = Object.getPrototypeOf(this);
    const flags = getOptionsDescription(proto);
    const positionals = getPositionalOptionsDescription(proto);
    parseOptions(flags, positionals, this, args);
  }

  // Default arguments supported by every command

  @longName("debug")
  @help("Output additional debug information for this command")
  public debug: boolean;

  @longName("format")
  @hasArg
  @help("Format of output for this command: json")
  public format: string;

  @shortName("h")
  @longName("help")
  @help("Display help for this command")
  public help: boolean;

  run(): Promise<Result.CommandResult> {
    throw new Error("Dev error, should be overridden!");
  }
}
