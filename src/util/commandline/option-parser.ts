import * as minimist from "minimist";
import * as util from "util";

const debug = require("debug")("sonoma-cli:util:commandline:option-parser");

export interface OptionDescription {
  shortName?: string;    // Short flag for option, single character
  longName?: string;     // long name for option
  required?: boolean;    // Is this is a required parameter, if not present defaults to false
  defaultValue?: string; // Default value for this option if it's not present
  hasArg?: boolean;      // Does this option take an argument?
}

export interface OptionsDescription {
  [field: string]: OptionDescription;
}

function optionKey(option: OptionDescription): string {
  return option.shortName || option.longName;
}

function descriptionToMinimistOpts(options: OptionsDescription): minimist.Options {

  let parseOpts: minimist.Options = {
    "boolean": <string[]>[],
    "string": <string[]>[],
    alias: {},
    default: {},
    unknown: (arg: string): boolean => { throw new Error(`Unknown argument ${arg}`); }
  };

  Object.keys(options)
    .map(key => options[key])
    .forEach(option => {
    const key = optionKey(option);

    // Is option a boolean or has a value?
    if (option.hasArg) {
      (<string[]>parseOpts.string).push(key);
    } else {
      (<string[]>parseOpts.boolean).push(key);
    }

    // If both names are given, set up alias
    if(option.shortName && option.longName) {
      parseOpts.alias[option.shortName] = option.longName;
    }

    if(option.defaultValue !== undefined) {
      parseOpts.default[key] = option.defaultValue;
    }

  });
  return parseOpts;
}

export function parseOptions(options: OptionsDescription,
    target: any, args: string[]) {

  const minimistOptions = descriptionToMinimistOpts(options);
  const parsed = minimist(args, minimistOptions);

 debug(`Raw parsed command line = ${util.inspect(parsed)}`);

  Object.keys(options).forEach(targetPropertyName => {
    const option = options[targetPropertyName];
    const optKey = optionKey(option);

    if (option.required && !parsed[optKey]) {
      // TODO: Replace this with auto-prompting
      throw new Error(`Missing required option ${optKey}`);
    }
    target[targetPropertyName] = parsed[optKey];
  });
}
