import { Command, CommandArgs, CommandResult } from "../../../../src/util/commandline";
import { SonomaClient } from "../../../../src/util/apis";

export default class AlwaysFailCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    throw new Error("Failed on purpose");
  }
}