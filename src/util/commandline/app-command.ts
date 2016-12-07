import { Command, CommandArgs } from "./command";
import { CommandResult, failure, ErrorCodes, ResultOrValue } from "./command-result";
import { help, longName, hasArg } from "./option-decorators";
import { Profile, DefaultApp, toDefaultApp, getUser } from "../profile";
import { scriptName } from "../misc";

const currentAppVar = "MOBILE_CENTER_CURRENT_APP";

export class AppCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @longName("app")
  @hasArg
  @help("Specify application for command to act on")
  private appOption: string;

  // Figure out which application to work on
  public get app(): DefaultApp {
    let result: DefaultApp;
    // Explicit command line
    if (this.appOption) {
      result = toDefaultApp(this.appOption);
      if (!result) {
        throw new Error(`'${this.appOption}' is not a valid application id`);
      }
    // Environment variable
    } else if (process.env[currentAppVar]) {
      result = toDefaultApp(process.env[currentAppVar]);
      if (!result) {
        throw new Error(`'${process.env[currentAppVar]}' (read from ${currentAppVar}) is not a valid application id`);
      }
    // Default app in profile
    } else {
      let profile = getUser();
      if (profile.defaultApp) {
        result = profile.defaultApp;

      // Couldn't find one, fail.
      } else {
        throw new Error(`Could not find application to work on. Specify the '--app' switch, use '${scriptName} apps set-current', or set the ${currentAppVar} environment variable.`);
      }
    }

    return result;
  }

  public get identifier(): string {
    return `${this.app.ownerName}/${this.app.appName}`;
  }
}

export function getCurrentApp(optValue: string): ResultOrValue<DefaultApp> {

  function fromCommandLineOpt(): ResultOrValue<DefaultApp> {
    if (optValue) {
      let result = toDefaultApp(optValue);
      if (!result) {
        return ResultOrValue.fromResult<DefaultApp>(failure(ErrorCodes.InvalidParameter,
          `'${optValue}' is not a valid application id`));
      }
      return ResultOrValue.fromValue(result);
    }
  }

  function fromEnvironment(): ResultOrValue<DefaultApp> {
    if (process.env[currentAppVar]) {
      let result = toDefaultApp(process.env[currentAppVar]);
      if (!result) {
        return ResultOrValue.fromResult<DefaultApp>(failure(ErrorCodes.InvalidParameter,
          `'${process.env[currentAppVar]}' (read from environment ${currentAppVar}) is not a valid application id`));
      }
      return ResultOrValue.fromValue(result);
    }
  }

  function fromProfile(): ResultOrValue<DefaultApp> {
    let profile = getUser();
    if (profile.defaultApp) {
      return ResultOrValue.fromValue(profile.defaultApp);
    }
  }

  return fromCommandLineOpt() || fromEnvironment() || fromProfile() ||
    ResultOrValue.fromResult<DefaultApp>(failure(ErrorCodes.InvalidParameter,
        `Could not find application to work on. Specify the '--app' switch, use '${scriptName} apps set-current', or set the ${currentAppVar} environment variable.`));
}
