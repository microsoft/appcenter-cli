import { Command } from "./command";
import { CommandResult, success } from "./command-result";
import { out } from "../interaction";

// "filler" command used to display category help
export class CategoryCommand extends Command {
  private category: string[];

  constructor(category: string[]) {
    // Don't pass to base class, nothing to parse
    super([], []);
    this.category = category;
  }

  async run(): Promise<CommandResult> {
    out.text(`category '${this.category.join(' ')}' help coming soon.`);
    return success();
  }
}
