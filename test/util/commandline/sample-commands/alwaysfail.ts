import { Command, CommandArgs, CommandResult } from "../../../../src/util/commandline";
import { AppCenterClient } from "../../../../src/util/apis";

export default class AlwaysFailCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async runNoClient(): Promise<CommandResult> {
    throw new Error("Failed on purpose");
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    throw new Error("Failed on purpose");
  }
}
