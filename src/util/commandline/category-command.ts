import * as fs from "fs";
import * as path from "path";
import { Command, CommandArgs } from "./command";
import { CommandResult, success } from "./command-result";
import { out } from "../interaction";
import { scriptName } from "../misc";
import { getClassHelpText } from "./option-decorators";
import chalk from "chalk";

const Table = require("cli-table3");
const debug = require("debug")("appcenter-cli:util:commandline:category-command");

// "filler" command used to display category help
export class CategoryCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  async execute(): Promise<CommandResult> {
    if (this.version) {
      debug("Version switch detected, displaying version number");
      return this.showVersion();
    }

    out.help();
    out.help(this.categoryHelp());
    out.help(`Version ${this.getVersion()}`);
    out.help();
    const command = "<command>";
    const commandTemplate = [scriptName].concat(this.command, [command]).join(" ");
    out.help(`Usage: ${chalk.bold(commandTemplate)}`);
    out.help();
    out.help("Commands:");

    const categoryContents = this.categoryDirContents();
    const subCategoriesHelp = this.subCategories(categoryContents);
    const categoryCommands = this.categoryCommands(categoryContents);
    const helpTable = subCategoriesHelp.concat(categoryCommands);

    // Calculate max length of the strings from the first column (category/commands names) - it will be a width for the first column;
    const firstColumnWidth = helpTable.reduce((contenderMaxWidth, row) => Math.max(row[0].length, contenderMaxWidth), 0);

    // Writing a help table
    const tableObject = new Table(out.getOptionsForTwoColumnTableWithNoBorders(firstColumnWidth));
    helpTable.forEach((row) => tableObject.push(row));
    out.help(tableObject.toString());

    return success();
  }

  categoryHelp(category: string = ""): string {
    debug(`Looking for category description in directory ${this.commandPath}`);
    const helpPath = path.join(this.commandPath, category, "category.txt");
    try {
      // Replacing CRLF with LF to make sure that cli-table3 will be able to correctly split the string
      const helpText = fs.readFileSync(helpPath, "utf8").replace(/\r\n/g, "\n");
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

  subCategories(contents: [string, fs.Stats][]): string[][] {
    return contents.filter((item) => item[1].isDirectory() && item[0] !== "lib")
      .map((item) => {
         return [chalk.bold(`    ${item[0]}    `), this.categoryHelp(item[0])];
      });
  }

  categoryCommands(contents: [string, fs.Stats][]): string[][] {
    // Locate commands in category directory
    return contents.filter((item) => item[1].isFile() && /\.[tj]s$/.test(item[0]))
      .map((item) => {
        return [chalk.bold(`    ${this.commandName(item)}    `), this.commandHelp(item)];
      });
  }

  commandName(item: [string, fs.Stats]): string {
    return path.parse(item[0]).name;
  }

  commandHelp(item: [string, fs.Stats]): string {
    const fullCommandPath = path.join(this.commandPath, item[0]);
    try {
      // Turn off tslint error, string is validated above
      /* tslint:disable-next-line:non-literal-require */
      const cmd = require(fullCommandPath).default;
      return getClassHelpText(cmd);
    } catch (err) {
      return `Unable to load ${fullCommandPath} to read help`;
    }
  }
}
