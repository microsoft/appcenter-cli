// Base class for all command handlers
import * as Result from "./command-result";
import { shortName, longName, help, hasArg, getOptionsDescription, getPositionalOptionsDescription, common } from "./option-decorators";
import { parseOptions } from "./option-parser";
import { setDebug, setQuiet, OutputFormatSupport, setFormatJson, out } from "../interaction";
import { runHelp } from "./help";
import { scriptName } from "../misc";
import { getUser, environments, telemetryIsEnabled, getPortalUrlForEndpoint, getEnvFromEnvironmentVar, getTokenFromEnvironmentVar, appCenterAccessTokenEnvVar } from "../profile";
import { AppCenterClient, createAppCenterClient, AppCenterClientFactory } from "../apis";
import * as path from "path";

const debug = require("debug")("appcenter-cli:util:commandline:command");

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
  protected clientFactory: AppCenterClientFactory;

  // Additional output formats (except "list" which is used by default) which are supported by this command
  protected readonly additionalSupportedOutputFormats: OutputFormatSupport = {
    json: setFormatJson
  };

  // Default arguments supported by every command

  @longName("debug")
  @help("Display extra output for debugging")
  @common
  public debug: boolean;

  @longName("output")
  @hasArg
  @help("Output format: json")
  @common
  public format: string;

  @longName("token")
  @hasArg
  @help("API token")
  @common
  public token: string;

  @longName("env")
  @hasArg
  @help("Environment when using API token")
  @common
  public environmentName: string;

  @shortName("h")
  @longName("help")
  @help("Display help for current command")
  @common
  public help: boolean;

  @longName("quiet")
  @help("Auto-confirm any prompts without waiting for input")
  @common
  public quiet: boolean;

  @shortName("v")
  @longName("version")
  @help(`Display ${scriptName} version`)
  @common
  public version: boolean;

  @longName("disable-telemetry")
  @help("Disable telemetry for this command")
  @common
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

      const version = this.getVersion();
      console.log(`Using appcenter-cli version: ${version}`);
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
    this.clientFactory = createAppCenterClient(this.command, await telemetryIsEnabled(this.disableTelemetry));
    return this.runNoClient();
  }

  // Entry point to load appcenter client.
  // Override this if your command needs to do something special with login - typically just
  // the login command
  protected runNoClient(): Promise<Result.CommandResult> {
    if (this.environmentName && !this.token) {
      return Promise.resolve(Result.failure(Result.ErrorCodes.IllegalCommand, "Cannot specify environment without giving token"));
    }

    let client: AppCenterClient;
    let endpoint: string;
    if (this.token) {
      debug(`Creating appcenter client for command from token for environment ${this.environmentName}`);
      [client, endpoint] = this.getClientAndEndpointForToken(this.environmentName, this.token);
    } else {
      // creating client for either logged in user or environment variable token
      const user = getUser();
      const tokenFromEnvVar = getTokenFromEnvironmentVar();
      const envFromEnvVar = getEnvFromEnvironmentVar();
      const isLogoutCommand = this.command[0] === "logout";
      if (user && tokenFromEnvVar && !isLogoutCommand) { // logout command should be executed even if both user and env token are set - it just logs out user
        return Promise.resolve(Result.failure(Result.ErrorCodes.IllegalCommand, `logged in user and token in environment variable ${appCenterAccessTokenEnvVar} cannot be used together`));
      } else if (user) {
        debug(`Creating appcenter client for command for current logged in user`);
        client = this.clientFactory.fromProfile(user);
        endpoint = user.endpoint;
      } else if (tokenFromEnvVar) {
        debug(`Creating appcenter client from token specified in environment variable for environment ${this.environmentName}`);
        [client, endpoint] = this.getClientAndEndpointForToken(envFromEnvVar, tokenFromEnvVar);
      }
    }
    if (client && endpoint) {
      return this.run(client, getPortalUrlForEndpoint(endpoint));
    }
    return Promise.resolve(Result.notLoggedIn(`${scriptName} ${this.command.join(" ")}`));
  }

  // Entry point for command author - override this!
  protected run(client: AppCenterClient, portalBaseUrl: string): Promise<Result.CommandResult> {
    throw new Error("Dev error, should be overridden!");
  }

  protected showVersion(): Result.CommandResult {
    out.text((s) => s, `${scriptName} version ${this.getVersion()}`);
    return Result.success();
  }

  protected getClientAndEndpointForToken(environmentString: string, token: string): [AppCenterClient, string] {
    const environment = environments(environmentString);
    if (!environment) {
      throw Result.failure(Result.ErrorCodes.InvalidParameter, `${environmentString} is not valid environment name`);
    }
    return [this.clientFactory.fromToken(token, environment.endpoint), environment.endpoint];
  }

  protected getVersion(): string {
    const packageJsonPath = path.join(__dirname, "../../../package.json");
    /* tslint:disable-next-line:non-literal-require */
    const packageJson: any = require(packageJsonPath);
    return packageJson.version;
  }

  protected fixArrayParameter(input: any): string[] {
    if (!input) {
      return [];
    } else if (typeof input === "string") {
      return [ input ];
    }

    return input;
  }
}
