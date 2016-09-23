// First example command

import { Command, CommandResult, ErrorCodes, success, failure } from "../util/commandline";
import { shortName, longName, required, hasArg } from "../util/commandline";

export default class WaitCommand extends Command {
  constructor(args: string[]) {
    super(args);
  }

  @shortName("d")
  @longName("delay")
  @required
  @hasArg
  public delay: string;

  async run(): Promise<CommandResult> {
    let delayMs: number = parseInt(this.delay);
    if (Number.isNaN(delayMs)) {
      return failure(ErrorCodes.InvalidParameter, `delay must be a number`);
    }

    console.log(`Waiting for ${delayMs} milliseconds...`);

    await new Promise(resolve => setTimeout(resolve, delayMs));
    return success();
  }
}