import { Command, CommandArgs, CommandResult, success } from "../../../../../src/util/commandline";

export default class CommandWithDashes extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  runNoClient(): Promise<CommandResult> {
    return Promise.resolve(success());
  }
}
