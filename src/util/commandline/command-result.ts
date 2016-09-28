// Results of exeuting a command.
// Includes general exit codes, specific known errors, or
// room for other errors.
// This consolidates success and failure into a single type.

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

export type CommandResult = CommandSucceededResult | CommandFailedResult;

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
  NotLoggedIn
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
    `Command '${command}' requires a logged in user. Use the 'sonoma login' command to log in.`);
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
