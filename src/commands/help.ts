import { Command, CommandArgs, CommandResult, help, runner, success, name, position } from "../util/commandline";

const debug = require("debug")("somona-cli:commands:help");
import { inspect } from "util";

@help("List available commands for use")
export default class HelpCommand extends Command {

  @name("command...")
  @position(null)
  @help("Command to get help on")
  commandToGetHelpFor: string[];

  constructor(args: CommandArgs) {
    super(args);
  }

  async execute(): Promise<CommandResult> {
    if (this.version) {
      return this.showVersion();
    }

    debug(`Getting help for "${inspect(this.commandToGetHelpFor)}"`);
    // Try to load help for the command in question
    // We just load the command and run the help
    const cmdRunner = runner(__dirname);
    if (!this.commandToGetHelpFor) {
     await cmdRunner([]);
    } else {
      await cmdRunner(this.commandToGetHelpFor.concat(["-h"]));
    }
    return success();
  }
}