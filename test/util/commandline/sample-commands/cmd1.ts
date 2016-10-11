import { Command, CommandResult, success } from "../../../../src/util/commandline";


export default class Command1 extends Command {
  constructor(command: string[], args: string[]) {
    super(command, args);
  }

  async run(): Promise<CommandResult> {
    return success();
  }
};
