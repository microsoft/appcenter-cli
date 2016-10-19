import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Command, CommandArgs } from "./command";
import { CommandResult, success } from "./command-result";
import { out } from "../interaction";
import { scriptName } from "./help";
import { getClassHelpText } from "./option-decorators";

const Table = require("cli-table2");
const debug = require("debug")("sonoma-cli:util:commandline:category-command");

// "filler" command used to display category help
export class CategoryCommand extends Command {
  constructor(args: CommandArgs) {
    // Don't pass args to base class, nothing to parse
    super({ commandPath: args.commandPath, command: args.command, args: []});
  }

  async runNoClient(): Promise<CommandResult> {
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

  categoryHelp(category: string = ""): string {
    debug(`Looking for category description in directory ${this.commandPath}`);
    const helpPath = path.join(this.commandPath, category, "category.txt");
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
    const helpTable = new Table(out.noTableBorders);
    contents.filter(item => item[1].isDirectory() && item[0] !== "lib")
      .forEach(item => {
        helpTable.push([ `    ${scriptName} ${this.command.join(" ")}${item[0]}`, this.categoryHelp(item[0])]);
      });

    return helpTable.toString();
  }

  categoryCommands(contents: [string, fs.Stats][]): string {
    // Locate commands in category directory
    const helpTable = new Table(out.noTableBorders);
    contents.filter(item => item[1].isFile() && /\.[tj]s$/.test(item[0]))
      .forEach(item => {
        helpTable.push([`    ${this.commandName(item)}`, this.commandHelp(item)]);
      });
    return helpTable.toString();
  }

  commandName(item: [string, fs.Stats]): string {
    const commandName = path.basename(item[0], path.extname(item[0]));
    let commandScript: string[];
    if (this.command.length > 0) {
      commandScript = [scriptName].concat(this.command).concat([commandName]);
    }
    else {
      commandScript = [scriptName, commandName];
    }

    return commandScript.join(" ");
  }

  commandHelp(item: [string, fs.Stats]): string {
    const fullCommandPath = path.join(this.commandPath, item[0]);
    try {
      const cmd = require(fullCommandPath).default;
      return getClassHelpText(cmd);
    } catch(err) {
      return `Unable to load ${fullCommandPath} to read help`;
    }
  }
}
