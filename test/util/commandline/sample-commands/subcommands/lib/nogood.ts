import { Command, CommandArgs, failed } from "../../../../../../src/util/commandline";
import { SonomaClient } from "../../../../../../src/util/apis";

export default class NoGoodCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  run(client: SonomaClient): Promise<CommandResult> {
    return Promise.resolve(failed("this shouldn't get called"));
  }
}
