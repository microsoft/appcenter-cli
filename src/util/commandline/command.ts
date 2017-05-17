// Base class for all command handlers
import * as Result from "./command-result";
import { shortName, longName, help, hasArg, getOptionsDescription, getPositionalOptionsDescription } from "./option-decorators";
import { OptionsDescription, PositionalOptionsDescription, parseOptions } from "./option-parser";
import { setDebug, isDebug, setQuiet, OutputFormatSupport, setFormatJson, out } from "../interaction";
import { runHelp } from "./help";
import { scriptName } from "../misc";
import { getUser, environments, telemetryIsEnabled } from "../profile";
import { MobileCenterClient, createMobileCenterClient, MobileCenterClientFactory } from "../apis";
import * as path from "path";
import * as PortalHelper from "../portal/portal-helper";

const debug = require("debug")("mobile-center-cli:util:commandline:command");
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
    debug(`Starting command with path ${args.commandPath}, command ${args.command}`);
  }

  // Used by help system to generate help messages
  protected command: string[];
  protected commandPath: string;

  // Support for login command
  protected clientFactory: MobileCenterClientFactory;

  // Additional output formats (except "list" which is used by default) which are supported by this command
  protected readonly additionalSupportedOutputFormats: OutputFormatSupport = {
    json: setFormatJson
  };

  // Default arguments supported by every command

  @longName("debug")
  @help("Output additional debug information for this command")
  public debug: boolean;

  @longName("output")
  @hasArg
  @help("Format of output for this command: json")
  public format: string;

  @longName("token")
  @hasArg
  @help("API Token to use for this command")
  public token: string;

  @longName("env")
  @hasArg
  @help("Environment to connect to when using api token")
  public environmentName: string;

  @shortName("h")
  @longName("help")
  @help("Display help for this command")
  public help: boolean;

  @longName("quiet")
  @help("Auto-confirm any requests, do not prompt for input")
  public quiet: boolean;

  @shortName("v")
  @longName("version")
  @help("Display command's version")
  public version: boolean;


  @longName("disable-telemetry")
  @help("Do not send any CLI telemetry for this command, overriding defaults")
  public disableTelemetry: boolean;

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

    if (this.quiet) {
      setQuiet();
    }

    if (this.format) {
      if (this.format in this.additionalSupportedOutputFormats) {
        this.additionalSupportedOutputFormats[this.format]();
      } else if (this.format != null && this.format !== "") {
        return Promise.resolve(Result.failure(Result.ErrorCodes.InvalidParameter, `Unknown output format ${this.format}`));
      }
    }
    this.clientFactory = createMobileCenterClient(this.command, await telemetryIsEnabled(this.disableTelemetry));
    return this.runNoClient();
  }

  // Entry point to load mobile center client.
  // Override this if your command needs to do something special with login - typically just
  // the login command
  protected runNoClient(): Promise<Result.CommandResult> {
    if (this.environmentName && !this.token) {
      return Promise.resolve(Result.illegal("Cannot specify environment without giving token"));
    }

    let client: MobileCenterClient;
    let endpoint: string;
    if (this.token) {
      let environment = environments(this.environmentName);
      debug(`Creating mobile center client for command from token`);
      client = this.clientFactory.fromToken(this.token, environment.endpoint);
      endpoint = environment.endpoint;
    } else {
      let user = getUser();
      if (user) {
        debug(`Creating mobile center client for command for current logged in user`);
        client = this.clientFactory.fromProfile(user);
        endpoint = user.endpoint;
      }
    }
    if (client && endpoint) {
      return this.run(client, PortalHelper.getPortalBaseUrl(endpoint));
    }
    return Promise.resolve(Result.notLoggedIn(`${scriptName} ${this.command.join(" ")}`));
  }

  // Entry point for command author - override this!
  protected run(client: MobileCenterClient, portalBaseUrl: string): Promise<Result.CommandResult> {
    throw new Error("Dev error, should be overridden!");
  }

  protected showVersion(): Result.CommandResult {
    const packageJsonPath = path.join(__dirname, "../../../package.json");
    const packageJson: any = require(packageJsonPath);
    out.text(s => s,`${scriptName} version ${packageJson.version}`);
    return Result.success();
  }
}
