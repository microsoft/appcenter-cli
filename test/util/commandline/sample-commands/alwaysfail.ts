import { Command, CommandArgs, CommandResult } from "../../../../src/util/commandline";

export default class AlwaysFailCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(): Promise<CommandResult> {
    throw new Error("Failed on purpose");
  }
}