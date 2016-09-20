// Base class for all command handlers
import * as Result from "./command-result";

export class Command {
  constructor(command: string[]) {

  }
  run(): Promise<Result.CommandResult> {
    throw new Error("Dev error, should be overridden!");
  }
}
