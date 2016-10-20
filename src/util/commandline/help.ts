// Help system - displays help for categories and commands

import { inspect } from "util";
const debug = require("debug")("sonoma-cli:util:commandline:help");

import { values, identity } from "lodash";
const Table = require("cli-table2");

import {
  getClassHelpText, getOptionsDescription, getPositionalOptionsDescription
} from "./option-decorators";

import {
  OptionDescription, OptionsDescription, PositionalOptionDescription, PositionalOptionsDescription
} from "./option-parser";

import { out, padLeft, padRight, setDebug } from "../interaction";

// TODO: update this with the real name of the
export const scriptName = "sonoma";

export function runHelp(commandPrototype: any, commandObj: any): void {
  const commandExample: string = getCommandExample(commandPrototype, commandObj);
  const commandHelp: string = getCommandHelp(commandObj);
  const optionsHelp: string[] = getOptionsHelp(commandPrototype);

  out.help(commandExample);
  out.help();
  out.help(commandHelp);

  if(optionsHelp.length > 0) {
    out.help();
    out.help("Command Options:");
    optionsHelp.forEach(h => out.help(h));
  }
  out.help();
}

function hasOptions(obj: any): boolean {
  return Object.keys(obj).length > 0;
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

function getOptionsHelp(commandPrototype: any): string[] {
  const switchOpts = getSwitchOptionsHelp(commandPrototype);
  const posOpts = getPositionalOptionsHelp(commandPrototype);

  const joiner = switchOpts.length > 0 && posOpts.length > 0 ? [ "" ] : [];

  return switchOpts.concat(joiner).concat(posOpts);
}

function getSwitchOptionsHelp(commandPrototype: any): string[] {
  const options = values(getOptionsDescription(commandPrototype)).map(toSwitchOptionHelp);
  debug(`Command has ${options.length} switch options:`);
  debug(options.map(o => `${o.shortName}|${o.longName}`).join("/"));
  const helpTable = new Table(out.noTableBorders);
  options.forEach(optionHelp => {
    helpTable.push(["    " + switchText(optionHelp), optionHelp.helpText])
  });
  return [ helpTable.toString() ];
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

function getPositionalOptionsHelp(commandPrototype: any): string[] {
  const options: PositionalOptionHelp[] = getPositionalOptionsDescription(commandPrototype).map(toPositionalOptionHelp);

  debug(`Command has ${options.length} positional options:`);
  debug(options.map(o => o.name).join("/"));

  const helpTable = new Table(out.noTableBorders);
  options.forEach(opt => {
    helpTable.push(["    " + opt.name, opt.helpText]);
  });
  return [helpTable.toString()];
}

function getCommandExample(commandPrototype: any, commandObj: any): string {
  let commandParts: string[] = commandObj.command;

  let script = commandParts[commandParts.length - 1];
  let extIndex = script.lastIndexOf(".");
  if (extIndex > -1) {
    script = script.slice(0, extIndex);
  }
  commandParts[commandParts.length - 1] = script;

  return `${scriptName} ${commandObj.command.join(" ")}`;
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
