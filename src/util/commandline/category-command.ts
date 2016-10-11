import { Command, CommandArgs } from "./command";
import { CommandResult, success } from "./command-result";
import { out } from "../interaction";

// "filler" command used to display category help
export class CategoryCommand extends Command {
  private category: string[];

  constructor(args: CommandArgs) {
    // Don't pass to base class, nothing to parse
    super({ commandPath: null, command: [], args: []});
    this.category = args.command;
  }

  async run(): Promise<CommandResult> {
    out.text(`category '${this.category.join(' ')}' help coming soon.`);
    return success();
  }
}
