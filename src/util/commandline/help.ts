// Help system - displays help for categories and commands

import * as _ from "lodash";
import * as os from "os";
import { isatty } from "tty";
import chalk from "chalk";

const debug = require("debug")("appcenter-cli:util:commandline:help");

const Table = require("cli-table3");

import {
  getClassHelpText, getOptionsDescription, getPositionalOptionsDescription
} from "./option-decorators";

import {
  OptionDescription, PositionalOptionDescription
} from "./option-parser";

import { out } from "../interaction";

import { scriptName } from "../misc";

const usageConst = "Usage: ";

export function runHelp(commandPrototype: any, commandObj: any): void {
  const commandExample: string = getCommandExample(commandPrototype, commandObj);
  const commandHelp: string = getCommandHelp(commandObj);
  const optionsHelpTable: any = getOptionsHelpTable(commandPrototype);
  const commonSwitchOptionsHelpTable: any = getCommonSwitchOptionsHelpTable(commandPrototype);

  out.help();
  out.help(commandHelp);
  out.help();
  out.help(usageConst + chalk.bold(commandExample));

  if (optionsHelpTable.length > 0) {
    out.help();
    out.help("Options:");
    out.help(optionsHelpTable.toString());
  }

  if (commonSwitchOptionsHelpTable.length > 0) {
    out.help();
    out.help("Common Options (works on all commands):");
    out.help(commonSwitchOptionsHelpTable.toString());
  }
}

function getCommandHelp(commandObj: any): string {
  const helpString = getClassHelpText(commandObj.constructor);
  return !!helpString ? helpString : "No help text for command. Dev, fix it!";
}

interface SwitchOptionHelp {
  shortName: string;
  longName: string;
  helpText: string;
  argName: string;
}

function toSwitchOptionHelp(option: OptionDescription): SwitchOptionHelp {
  return {
    shortName: option.shortName ? `-${option.shortName}` : "",
    longName: option.longName ? `--${option.longName}` : "",
    helpText: option.helpText || "",
    argName: option.hasArg ? "<arg>" : ""
  };
}

function getOptionsHelpTable(commandPrototype: any): any {
  const nonCommonSwitchOpts = getSwitchOptionsHelp(commandPrototype, false);
  const posOpts = getPositionalOptionsHelp(commandPrototype);
  return getStyledOptionsHelpTable(nonCommonSwitchOpts.concat(posOpts));
}

function getCommonSwitchOptionsHelpTable(commandPrototype: any): any {
  const commonSwitchOpts = getSwitchOptionsHelp(commandPrototype, true);
  return getStyledOptionsHelpTable(commonSwitchOpts);
}

function getStyledOptionsHelpTable(options: string[][]): any {
  const opts = styleOptsTable(options);

  // Calculate max length of the strings from the first column (switches/positional parameters) - it will be a width for the first column;
  const firstColumnWidth = opts.reduce((contenderMaxWidth, optRow) => Math.max(optRow[0].length, contenderMaxWidth), 0);

  // Creating a help table object
  const helpTableObject = new Table(out.getOptionsForTwoColumnTableWithNoBorders(firstColumnWidth));
  opts.forEach((opt) => helpTableObject.push(opt));

  return helpTableObject;
}

function getSwitchOptionsHelp(commandPrototype: any, isCommon: boolean): string[][] {
  const switchOptions = getOptionsDescription(commandPrototype);
  const filteredSwitchOptions = filterOptionDescriptions(_.values(switchOptions), isCommon);
  const options = sortOptionDescriptions(filteredSwitchOptions).map(toSwitchOptionHelp);
  debug(`Command has ${options.length} switch options:`);
  debug(options.map((o) => `${o.shortName}|${o.longName}`).join("/"));
  return options.map((optionHelp) => [`    ${switchText(optionHelp)}    `, optionHelp.helpText]);
}

interface PositionalOptionHelp {
  name: string;
  helpText: string;
}

function toPositionalOptionHelp(option: PositionalOptionDescription): PositionalOptionHelp {
  return {
    name: option.name,
    helpText: option.helpText
  };
}

function getPositionalOptionsHelp(commandPrototype: any): string[][] {
  const options: PositionalOptionHelp[] = getPositionalOptionsDescription(commandPrototype).map(toPositionalOptionHelp);

  debug(`Command has ${options.length} positional options:`);
  debug(options.map((o) => o.name).join("/"));

  return options.map((optionsHelp) => [`    ${optionsHelp.name}    `, optionsHelp.helpText]);
}

function switchText(switchOption: SwitchOptionHelp): string {
  // Desired formats look like:
  //
  //  -x
  //  -x|--xopt
  //     --xopt
  //  -y <arg>
  //  -y|--yopt <arg>
  //     --yopt <arg>
  const start = switchOption.shortName ? [ switchOption.shortName ] : [ "  " ];
  const sep = switchOption.shortName && switchOption.longName ? [ "|" ] : [ " " ];
  const long = switchOption.longName ? [ switchOption.longName ] : [];
  const arg = switchOption.argName ? [ " " + switchOption.argName ] : [];
  return start.concat(sep).concat(long).concat(arg).join("");
}

function terminalWidth(): number {
  // If stdout is a terminal, return the width
  if (isatty(1)) {
    return (process.stdout as any).columns;
  }

  // Otherwise return something useful.
  return 80;
}

function getCommandExample(commandPrototype: any, commandObj: any): string {
  const commandName = getCommandName(commandObj);
  const lines: string[] = [];
  const lastLinesLeftMargin = "  "; // 2 spaces
  const linesSeparator = os.EOL + lastLinesLeftMargin;
  let currentLine = `${scriptName} ${commandName}`;

  const maxWidth = terminalWidth();
  const separatorLength = os.EOL.length;
  const firstLineFreeSpace = maxWidth - usageConst.length - separatorLength;
  const freeSpace = firstLineFreeSpace - lastLinesLeftMargin.length;
  const leftMargin = _.repeat(" ", usageConst.length);
  getAllOptionExamples(commandPrototype)
    .forEach((example) => {
      if (currentLine.length + example.length + 1 > (lines.length ? freeSpace : firstLineFreeSpace)) {
        lines.push(currentLine);
        currentLine = leftMargin + example;
      } else {
        currentLine += ` ${example}`;
      }
    });

  lines.push(currentLine);

  return lines.join(linesSeparator);
}

function getCommandName(commandObj: any): string {
  const commandParts: string[] = commandObj.command;

  let script = commandParts[commandParts.length - 1];
  const extIndex = script.lastIndexOf(".");
  if (extIndex > -1) {
    script = script.slice(0, extIndex);
  }
  commandParts[commandParts.length - 1] = script;
  return commandParts.join(" ");
}

function getAllOptionExamples(commandPrototype: any): string[] {
  return getSwitchOptionExamples(commandPrototype, false)
    .concat(getPositionalOptionExamples(commandPrototype));
}

function getSwitchOptionExamples(commandPrototype: any, includeCommon: boolean = true): string[] {
  const switchOptions = getOptionsDescription(commandPrototype);
  const switchOptionDescriptions = includeCommon ? _.values(switchOptions) : filterOptionDescriptions(_.values(switchOptions), false);

  return sortOptionDescriptions(switchOptionDescriptions)
    .map((description: OptionDescription): string => {
      const result: string[] = [];
      result.push(description.shortName ? `-${description.shortName}` : "");
      result.push(description.shortName && description.longName ? "|" : "");
      result.push(description.longName ? `--${description.longName}` : "");
      result.push(description.hasArg ? " <arg>" : "");
      if (!description.required) {
        result.unshift("[");
        result.push("]");
      }
      return result.join("");
    });
}

function getPositionalOptionExamples(commandPrototype: any): string[] {
  const positionalOptions = getPositionalOptionsDescription(commandPrototype);

  return _.sortBy(positionalOptions, "position")
    .map((description): string => {
      if (description.position !== null) {
        return `<${description.name}>`;
      }
      // Output for "rest" parameter. sortBy will push it to the end.
      return `<${description.name}...>`;
    });
}

function styleOptsTable(table: string[][]): string[][] {
  return table.map((row) => [chalk.bold(row[0])].concat(row.slice(1)));
}

function sortOptionDescriptions(options: OptionDescription[]): OptionDescription[] {
  return _(options)
    .reverse() // options from a top prototype are added first, reversing order
    .sortBy([(opt: OptionDescription) => opt.required ? 0 : 1]) // required options should be shown first
    .value();
}

function filterOptionDescriptions(options: OptionDescription[], isCommon: boolean): OptionDescription[] {
  return isCommon ? options.filter((option) => { return option.common; }) :  options.filter((option) => { return !option.common; });
}
