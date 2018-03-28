// Results of exeuting a command.
// Includes general exit codes, specific known errors, or
// room for other errors.
// This consolidates success and failure into a single type.

import { scriptName } from "../misc/constants";

export interface CommandSucceededResult {
  // Nothing to say here, it just works. :-)
  succeeded: boolean;
}

export interface CommandFailedResult {
  succeeded: boolean;
  errorCode: number;
  errorMessage: string;
  exception?: Error;
}

export function isCommandFailedResult(object: any): object is CommandFailedResult {
  return object != null
    && typeof(object.succeeded) === "boolean"
    && typeof(object.errorCode) === "number"
    && typeof(object.errorMessage) === "string";
}

export type CommandResult = CommandSucceededResult | CommandFailedResult;

export class ResultOrValue<T> {
  value: T;
  result: CommandResult;

  private constructor(value: T, result: CommandResult) {
    this.value = value;
    this.result = result;
  }

  public static fromValue<T>(value: T): ResultOrValue<T> {
    return new ResultOrValue<T>(value, null);
  }

  public static fromResult<T>(result: CommandResult): ResultOrValue<T> {
    return new ResultOrValue<T>(null, result);
  }
}

export enum ErrorCodes {
  Succeeded = 0,
  // Command given contained illegal characters/names
  IllegalCommand,
  // Command was legal, but not found
  NoSuchCommand,
  // Unhandled exception occurred
  Exception,
  // A parameter is invalid
  InvalidParameter,
  // Command requires logged in user
  NotLoggedIn,
  // The requested resource was not found
  NotFound
}

// Cache this, we only ever need one
const successResult = {
  succeeded: true
};

// Factory functions for various results

export function success(): CommandResult {
  return successResult;
}

// Used when there's a failure otherwise
export function failure(errorCode: number, errorMessage: string): CommandResult {
  return {
    succeeded: false,
    errorCode,
    errorMessage
  };
}

export function illegal(command: string): CommandResult {
  return failure(ErrorCodes.IllegalCommand,
    `Command ${command} is invalid`);
}

export function notFound(command: string): CommandResult {
  return failure(ErrorCodes.NoSuchCommand,
    `Command ${command} not found`);
}

export function notLoggedIn(command: string): CommandResult {
  return failure(ErrorCodes.NotLoggedIn,
    `Command '${command}' requires a logged in user. Use the '${scriptName} login' command to log in.`);
}

export function exception(command: string, ex: Error): CommandResult {
  return {
    succeeded: false,
    errorCode: ErrorCodes.Exception,
    errorMessage: `Command '${command}' failed with exception "${ex.message}"`,
    exception: ex
  };
}

// Type checks for results
export function succeeded(result: CommandResult): result is CommandSucceededResult {
  return result.succeeded;
}

export function failed(result: CommandResult): result is CommandFailedResult {
  return !result.succeeded;
}
