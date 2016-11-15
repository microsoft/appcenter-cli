import { Command, CommandArgs, CommandResult, success } from "../../../../../src/util/commandline";
import { MobileCenterClient } from "../../../../../src/util/apis";

export default class Command2 extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    return success();
  }
};
