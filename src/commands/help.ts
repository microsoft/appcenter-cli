import { Command, CommandArgs, CommandResult, help, runner, name, position, isCommandFailedResult, ErrorCodes, failure } from "../util/commandline";
import { scriptName } from "../util/misc";

const debug = require("debug")("appcenter-cli:commands:help");
import { inspect } from "util";

@help(`Get help using ${scriptName} commands`)
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
    const result = !this.commandToGetHelpFor ? await cmdRunner([]) : await cmdRunner(this.commandToGetHelpFor.concat(["-h"]));

    if (isCommandFailedResult(result) && result.errorCode === ErrorCodes.NoSuchCommand) {
      return failure(ErrorCodes.NoSuchCommand, `command ${this.commandToGetHelpFor.join(" ")} doesn't exist`);
    } else {
      return result;
    }
  }
}
