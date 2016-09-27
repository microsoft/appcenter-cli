// First example command

import { Command, CommandResult, ErrorCodes, success, failure } from "../util/commandline";
import { shortName, longName, required, hasArg } from "../util/commandline";
import { out } from "../util/interaction";

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

    await out.progress(`Waiting for ${delayMs} milliseconds... `,
      new Promise(resolve => setTimeout(resolve, delayMs)));
    console.log("Done!");
    return success();
  }
}
