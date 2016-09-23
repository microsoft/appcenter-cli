import { Command, CommandResult, success } from "../../../../../src/util/commandline";

export default class Command2 extends Command {
  constructor(commandArgs: string[]) {
    super(commandArgs);
  }

  async run(): Promise<CommandResult> {
    return success();
  }
};
