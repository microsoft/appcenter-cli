import { Command, CommandArgs, CommandResult, failure } from "../../../../../../src/util/commandline";
import { AppCenterClient } from "../../../../../../src/util/apis";

export default class NoGoodCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  run(client: AppCenterClient): Promise<CommandResult> {
    return Promise.resolve(failure(5, "this shouldn't get called"));
  }
}
