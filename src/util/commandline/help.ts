// Help system - displays help for categories and commands

import { getClassHelpText, getOptionsDescription, getPositionalOptionsDescription } from "./option-decorators";

import {
  OptionDescription, OptionsDescription, PositionalOptionDescription, PositionalOptionsDescription
} from "./option-parser";

// TODO: update this with the real name of the
const scriptName = "sonoma";

export function runHelp(commandPrototype: any, commandObj: any): void {
  const commandExample: string = getCommandExample(commandPrototype, commandObj);
  const commandHelp: string = getCommandHelp(commandPrototype);
  const optionsHelp: string[] = getOptionsHelp(commandPrototype);
}

function getCommandHelp(commandPrototype: any): string {
  const helpString = getClassHelpText(commandPrototype);
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
  return "Help text in progress";
}