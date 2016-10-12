import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Command, CommandArgs } from "./command";
import { CommandResult, success } from "./command-result";
import { out } from "../interaction";
import { scriptName } from "./help";
import { getClassHelpText } from "./option-decorators";

// "filler" command used to display category help
export class CategoryCommand extends Command {
  constructor(args: CommandArgs) {
    // Don't pass args to base class, nothing to parse
    super({ commandPath: args.commandPath, command: args.command, args: []});
  }

  async run(): Promise<CommandResult> {
    out.help(`${scriptName} ${this.command.join(" ")}`);
    out.help();
    out.help(this.categoryHelp());
    out.help();
    const categoryContents = this.categoryDirContents();

    out.help(this.subCategories(categoryContents));
    out.help();
    out.help(this.categoryCommands(categoryContents));
    return success();
  }

  categoryHelp(): string {
    const helpPath = path.join(this.commandPath, "category.txt");
    try {
      const helpText = fs.readFileSync(helpPath, "utf8");
      return helpText;
    } catch (err) {
      if (err.code === "ENOENT") {
        return "No category description found";
      }
      throw err;
    }
  }

  categoryDirContents(): [string, fs.Stats][] {
    const dirFiles = fs.readdirSync(this.commandPath);
    return dirFiles.map((fileName: string): [string, fs.Stats] => {
      return [fileName, fs.statSync(path.join(this.commandPath, fileName))];
    });
  }

  subCategories(contents: [string, fs.Stats][]): string {
    return contents.filter(item => item[1].isDirectory())
      .filter(item => item[0] !== "lib")
      .map(item => {
        return `\t${scriptName} ${this.command.join(' ')} ${item}`;
      }).join(os.EOL);
  }

  categoryCommands(contents: [string, fs.Stats][]): string {
    // Locate commands in category directory
    return contents.filter(item => item[1].isFile())
      .filter(item => /\.[tj]s$/.test(item[0]))
      .map(item => this.getCommandHelp(item[0]))
      .join(os.EOL);
  }

  getCommandHelp(commandFile: string): string {
    const commandName = path.basename(commandFile, path.extname(commandFile));
    const fullCommandPath = path.join(this.commandPath, commandFile);
    try {
      const cmd = require(fullCommandPath).default;
      return `${scriptName} ${this.command} ${commandName} ${getClassHelpText(cmd)}`;
    } catch(err) {
      return `Unable to load ${fullCommandPath} to read help`;
    }
  }
}
