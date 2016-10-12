// Help system - displays help for categories and commands

import {
  getClassHelpText, getOptionsDescription, getPositionalOptionsDescription
} from "./option-decorators";

import {
  OptionDescription, OptionsDescription, PositionalOptionDescription, PositionalOptionsDescription
} from "./option-parser";

import { out } from "../interaction";

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
  optionsHelp.forEach(h => out.help(h));
}

function getCommandHelp(commandObj: any): string {
  const helpString = getClassHelpText(commandObj.constructor);
  return !!helpString ? helpString : "No help text for command. Dev, fix it!";
}

function getOptionsHelp(commandPrototype: any): string[] {
  return [
    "-h|--help Get Help",
    "--debug   Output extra debugging information",
    "-f|--format <format>  Output format"
  ];
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