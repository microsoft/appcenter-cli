import { Command, CommandArgs, CommandResult, success } from "../../../../src/util/commandline";
import { AppCenterClient } from "../../../../src/util/apis";

export default class Command1 extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async runNoClient(): Promise<CommandResult> {
    return success();
  }

  async run(client: AppCenterClient): Promise<CommandResult> {
    return success();
  }
}
