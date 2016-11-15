import { Command, CommandArgs, CommandResult, failure } from "../../../../../../src/util/commandline";
import { MobileCenterClient } from "../../../../../../src/util/apis";

export default class NoGoodCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  run(client: MobileCenterClient): Promise<CommandResult> {
    return Promise.resolve(failure(5, "this shouldn't get called"));
  }
}
