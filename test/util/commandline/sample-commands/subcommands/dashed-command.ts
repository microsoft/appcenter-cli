import { Command, CommandArgs, CommandResult, succeeded } from "../../../../../util/commandline";

export default class CommandWithDashes extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  runNoClient(): Promise<CommandResult> {
    return Promise.resolve(succeeded());
  }
}