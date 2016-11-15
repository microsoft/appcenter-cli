import { Command, CommandArgs, CommandResult } from "../../../../src/util/commandline";
import { MobileCenterClient } from "../../../../src/util/apis";

export default class AlwaysFailCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async runNoClient(): Promise<CommandResult> {
    throw new Error("Failed on purpose");
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    throw new Error("Failed on purpose");
  }
}