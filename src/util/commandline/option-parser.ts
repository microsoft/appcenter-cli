import * as minimist from "minimist";
import * as util from "util";

const debug = require("debug")("appcenter-cli:util:commandline:option-parser");

// Flag arguments

export interface OptionDescription {
  shortName?: string;               // Short flag for option, single character
  longName?: string;                // long name for option
  required?: boolean;               // Is this is a required parameter, if not present defaults to false
  defaultValue?: string | string[]; // Default value for this option if it's not present
  hasArg?: boolean;                 // Does this option take an argument?
  helpText?: string;                // Help text for this parameter
  common?: boolean;                 // Is this option an common option?
}

export interface OptionsDescription {
  [field: string]: OptionDescription;
}

function optionKey(option: OptionDescription): string {
  return option.shortName || option.longName;
}

function optionDisplayName(options: OptionDescription): string {
  const short = options.shortName ? "-" + options.shortName : null;
  const long = options.longName ? "--" + options.longName : null;
  return [ short, long ].filter((x) => !!x).join(" / ");
}

// Positional arguments

export interface PositionalOptionDescription {
  name: string;          // Name used in error messages & help
  propertyName: string;  // Name of property in target object this goes it
  position: number;      // if null, is the "rest" argument and consumes any leftover positional args
  required?: boolean;    // Is this a required parameter?
  defaultValue?: string; // Default value for this arg if not present
  helpText?: string;     // Help text for this parameter
}

export type PositionalOptionsDescription = PositionalOptionDescription[];

function descriptionToMinimistOpts(options: OptionsDescription): minimist.Opts {

  const parseOpts: minimist.Opts = {
    boolean: [] as string[],
    string: [] as string[],
    alias: {},
    default: {},
    unknown: (arg: string): boolean => {
      if (arg.charAt(0) === "-") {
        throw new Error(`Unknown argument ${arg}`);
      }
      return true;
    }
  };

  Object.keys(options)
    .map((key) => options[key])
    .forEach((option) => {
    const key = optionKey(option);

    // Is option a boolean or has a value?
    if (option.hasArg) {
      (parseOpts.string as string[]).push(key);
    } else {
      (parseOpts.boolean as string[]).push(key);
    }

    // If both names are given, set up alias
    if (option.shortName && option.longName) {
      parseOpts.alias[option.shortName] = option.longName;
    }

    if (option.defaultValue !== undefined) {
      parseOpts.default[key] = option.defaultValue;
    }

  });
  return parseOpts;
}

export function parseOptions(flagOptions: OptionsDescription,
  positionalOptions: PositionalOptionsDescription,
  target: any, args: string[]): void;
export function parseOptions(flagOptions: OptionsDescription, target: any, args: string[]): void;
export function parseOptions(...params: any[]): void {
  let flagOptions: OptionsDescription;
  let positionalOptions: PositionalOptionsDescription;
  let target: any;
  let args: string[];

  if (params.length === 4) {
    debug(`Parser called with 4 args: ${util.inspect(params)}`);
    [flagOptions, positionalOptions, target, args] = params;
  } else {
    debug(`Parser called with 3 args: ${util.inspect(params)}`);
    [flagOptions, target, args] = params;
    positionalOptions = [];
  }

  debug(`Parsing command line ${args.join(" ")}`);
  const minimistOptions = descriptionToMinimistOpts(flagOptions);
  const parsed = minimist(args, minimistOptions);

  debug(`Raw parsed command line = ${util.inspect(parsed)}`);

  // handle flag args
  Object.keys(flagOptions).forEach((targetPropertyName) => {
    const option = flagOptions[targetPropertyName];
    const optKey = optionKey(option);

    // Skip required args if help or version have been invoked
    if (!parsed["help"] && !parsed["version"] && option.required && !parsed[optKey]) {
      // TODO: Replace this with auto-prompting
      throw new Error(`Missing required option ${optionDisplayName(option)}`);
    }
    target[targetPropertyName] = parsed[optKey];
  });

  // Handle positional args
  const positionalArgs = parsed["_"] || [];

  positionalOptions.sort((a, b) => {
    if (a.position === null) { return +1; }
    if (b.position === null) { return -1; }
    return b.position - a.position;
  });

  // Check for leftover positional parameters, fail if found
  const hasRestOption = positionalOptions.some((o) => o.position === null);
  if (!hasRestOption && positionalArgs.length > positionalOptions.length) {
    const unknownArgs = positionalArgs.slice(positionalOptions.length);
    throw new Error(`Unknown arguments: ${unknownArgs.join(" ")}`);
  }

  positionalOptions.forEach((opt, index) => {
    debug(`Checking for ${opt.required ? "required" : "optional" } option ${opt.name} at position ${opt.position}`);

    if (positionalArgs.length - 1 < opt.position) {
      if (!parsed["help"] && opt.required) {
        throw new Error(`Missing required positional argument ${opt.name}`);
      } else if (opt.defaultValue) {
        target[opt.propertyName] = opt.defaultValue;
        return;
      } else {
        return;
      }
    }

    if (opt.position !== null) {
      target[opt.propertyName] = positionalArgs[opt.position];
      positionalArgs[opt.position] = null;
    } else {
      // This is the rest argument, pick up whatever's left
      target[opt.propertyName] = positionalArgs.filter((opt) => opt !== null);
    }
  });
}
