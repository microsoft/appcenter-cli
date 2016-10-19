// Help system - displays help for categories and commands

import { inspect } from "util";
const debug = require("debug")("sonoma-cli:util:commandline:help");

import {
  getClassHelpText, getOptionsDescription, getPositionalOptionsDescription
} from "./option-decorators";

import {
  OptionDescription, OptionsDescription, PositionalOptionDescription, PositionalOptionsDescription
} from "./option-parser";

import { out, padLeft, padRight, setDebug } from "../interaction";
setDebug();

// TODO: update this with the real name of the
export const scriptName = "sonoma";

export function runHelp(commandPrototype: any, commandObj: any): void {
  const commandExample: string = getCommandExample(commandPrototype, commandObj);
  const commandHelp: string = getCommandHelp(commandObj);
  const optionsHelp: string[] = getOptionsHelp(commandPrototype);

  out.help(commandExample);
  out.help();
  out.help(commandHelp);
  out.help();
  out.help("Command Options:");
  optionsHelp.forEach(h => out.help(h));
  out.help();
}

function getCommandHelp(commandObj: any): string {
  const helpString = getClassHelpText(commandObj.constructor);
  return !!helpString ? helpString : "No help text for command. Dev, fix it!";
}

interface OptionHelp {
  shortName: string;
  longName: string;
  helpText: string;
  argName: string;
}

function toOptionHelp(option: OptionDescription): OptionHelp {
  return {
    shortName: option.shortName ? `-${option.shortName}` : "",
    longName: option.longName ? `--${option.longName}` : "",
    helpText: option.helpText || "",
    argName: option.hasArg ? "<arg>" : ""
  };
}

function getOptionsHelp(commandPrototype: any): string[] {
  const options = mapObj(toOptionHelp, getOptionsDescription(commandPrototype));

  let switches = formatHelpSwitches(options);
  let maxSwitchLen = maxFieldLen(s => s, switches);
  return switches.map((s, idx) => `${padRight(maxSwitchLen, s)} ${options[idx].helpText}`);
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

function formatHelpSwitches(options: OptionHelp[]): string[] {
  // Desired formats look like:
  //
  //  -x
  //  -x|--xopt
  //     --xopt
  //  -y <arg>
  //  -y|--yopt <arg>
  //     --yopt <arg>

  const maxShortNameLen = maxFieldLen(opt => opt.shortName, options);

  const switches = options.map(option => formatHelpSwitch(maxShortNameLen, option));
  const maxSwitchLen = maxFieldLen(opt => opt, switches);
  return switches.map(line => padRight(maxSwitchLen + 1, line));
}

function formatHelpSwitch(maxShortNameLen: number, option: OptionHelp): string {
  const short = padLeft(maxShortNameLen, option.shortName);
  const separator = (!!option.shortName && !!option.longName) ? "|" : " ";

  return `\t${short}${separator}${option.longName}${!!option.argName ? " " + option.argName : ""}`;
}

//
// Generic helper formatting functions
//

function mapObj<TOut>(mapper: {(item: any): TOut}, items: any): TOut[] {
  return Object.keys(items).map((key: string) => mapper(items[key]));
}

function maxFieldLen(selector: {(option: any): string}, options: any[]) {
  return options.reduce((prev, option) => Math.max(prev, selector(option).length), -1);
}
