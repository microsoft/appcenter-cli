import { Command, CommandResult } from "../../../../src/util/commandline";

export default class AlwaysFailCommand extends Command {
  constructor(command: string[], args: string[]) {
    super(command, args);
  }

  async run(): Promise<CommandResult> {
    throw new Error("Failed on purpose");
  }
}