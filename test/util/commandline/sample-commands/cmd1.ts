import { Command, CommandArgs, CommandResult, success } from "../../../../src/util/commandline";


export default class Command1 extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(): Promise<CommandResult> {
    return success();
  }
};
