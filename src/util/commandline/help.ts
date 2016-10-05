// Help system - displays help for categories and commands

import { classHelpTextKey } from "./options-decorators";
import {
  OptionDescription, OptionsDescription, PositionalOptionDescription, PositionalOptionsDescrition
} from "./option-parser";

// TODO: update this with the real name of the
const scriptName = "sonoma";

export function runHelp(commandPrototype: any, commandObj: any): void {
  const commandExample: string = getCommandExample(commandPrototype, commandObj);
  const commandHelp: string = getCommandHelp(commandPrototype);
  const optionsHelp: string[] = getOptionsHelp(commandPrototype);
}