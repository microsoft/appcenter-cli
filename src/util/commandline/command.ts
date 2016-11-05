// Base class for all command handlers
import * as Result from "./command-result";
import { shortName, longName, help, hasArg, getOptionsDescription, getPositionalOptionsDescription } from "./option-decorators";
import { OptionsDescription, PositionalOptionsDescription, parseOptions } from "./option-parser";
import { setDebug, isDebug, setFormatJson, out } from "../interaction";
import { runHelp } from "./help";
import { scriptName } from "../misc";
import { getUser } from "../profile";
import { SonomaClient, createSonomaClient } from "../apis";
import * as path from "path";

const debug = require("debug")("sonoma-cli:util:commandline:command");
import { inspect } from "util";

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

  @longName("output")
  @hasArg
  @help("Format of output for this command: json")
  public format: string;

  @shortName("h")
  @longName("help")
  @help("Display help for this command")
  public help: boolean;

  @shortName("v")
  @longName("version")
  @help("Display command's version")
  public version: boolean;

  // Entry point for runner. DO NOT override in command definition!
  async execute(): Promise<Result.CommandResult> {
    debug(`Initial execution of command`);
    if (this.help) {
      debug(`help switch detected, displaying help for command`);
      runHelp(Object.getPrototypeOf(this), this);
      return Result.success();
    }

    if (this.version) {
      debug("Version switch detected, displaying version number");
      return this.showVersion();
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
            return Promise.resolve(
              Result.failure(Result.ErrorCodes.InvalidParameter, `Unknown output format ${this.format}`)
            );
        }
    }
    return this.runNoClient();
  }

  // Entry point to load sonoma client.
  // Override this if your command needs to do something special with login - typically just
  // the login command
  protected runNoClient(): Promise<Result.CommandResult> {
    debug(`Creating sonoma client for command`);
    var user = getUser();
    if (user) {
      debug(`running commmand logic`);
      return this.run(createSonomaClient(user));
    }
    return Promise.resolve(Result.notLoggedIn(`${scriptName} ${this.command.join(" ")}`));
  }

  // Entry point for command author - override this!
  protected run(client: SonomaClient): Promise<Result.CommandResult> {
    throw new Error("Dev error, should be overridden!");
  }

  protected showVersion(): Result.CommandResult {
    const packageJsonPath = path.join(__dirname, "../../../package.json");
    const packageJson: any = require(packageJsonPath);
    out.text(s => s,`${scriptName} version ${packageJson.version}`);
    return Result.success();
  }
}
