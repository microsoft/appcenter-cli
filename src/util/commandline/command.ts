// Base class for all command handlers
import * as Result from "./command-result";
import { shortName, longName, help, hasArg, getOptionsDescription, getPositionalOptionsDescription } from "./option-decorators";
import { OptionsDescription, PositionalOptionsDescription, parseOptions } from "./option-parser";
import { setDebug, isDebug, setFormatJson } from "../interaction";
import { runHelp } from "./help";
import { getUser } from "../profile";
import { SonomaClient, createSonomaClient } from "../apis";

import { inspect } from "util";
const debug = require("debug")("sonoma-cli:util:commandline:command");

export interface CommandArgs {
  command: string[];
  commandPath: string;
  args: string[];
}

export class Command {
  constructor(args: CommandArgs) {
    const proto = Object.getPrototypeOf(this);
    const flags = getOptionsDescription(proto);
    const positionals = getPositionalOptionsDescription(proto);
    parseOptions(flags, positionals, this, args.args);
    this.commandPath = args.commandPath;
    this.command = args.command;
  }

  // Used by help system to generate help messages
  protected command: string[];
  protected commandPath: string;

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

  // Entry point for runner. DO NOT override in command definition!
  async execute(): Promise<Result.CommandResult> {

    if (this.help) {
      runHelp(Object.getPrototypeOf(this), this);
      return Result.success();
    }

    if (this.debug) {
      setDebug();
    }

    if (this.format) {
        switch(this.format) {
          case null:
          case "":
            break;
          case "json":
            setFormatJson();
            break;

          default:
            throw new Error(`Unknown output format ${this.format}`);
        }
    }
    return this.runNoClient();
  }

  // Entry point to load sonoma client.
  // Override this if your command needs to do something special with login - typically just
  // the login command
  protected runNoClient(): Promise<Result.CommandResult> {
    var user = getUser();
    if (user) {
      return this.run(createSonomaClient(user));
    }
    return Promise.resolve(Result.notLoggedIn("You are not logged in. Use the 'sonoma login' command to log in."));
  }

  // Entry point for command author - override this!
  protected run(client: SonomaClient): Promise<Result.CommandResult> {
    throw new Error("Dev error, should be overridden!");
  }
}
