import { Command, CommandArgs, CommandResult, success } from "../../../../src/util/commandline";
import { SonomaClient } from "../../../../src/util/apis";


export default class Command1 extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async runNoClient(): Promise<CommandResult> {
    return success();
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    return success();
  }
};
