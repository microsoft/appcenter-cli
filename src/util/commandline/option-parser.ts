
export interface OptionDescription {
  shortName: string; // Short flag for option, single character
  longName?: string; // long name for option
  required?: boolean; // Is this is a required parameter, if not present defaults to false
}

export interface OptionsDescription {
  [field: string]: OptionDescription;
}

export function parseOptions(options: OptionsDescription,
    target: any, args: string[]): string[] {
  const optKeys = Object.keys(options);
  let errors: string[] = [];
  optKeys.forEach(key => {
    errors = errors.concat(parseFlagOption(key, options[key], target, args))
  });
  return errors.length === 0 ? null : errors;
}

// Look for a single option in the command line that doesn't take an argument.
function parseFlagOption(optionKey: string, option: OptionDescription, target: any, args: string[]): string[] {
  let errors: string[] = [];
  for(let i = 0; i < args.length; ++i) {
    let arg = args[i];
    if (arg.slice(2) === "--") {
      // handle long option
    } else if (arg.charAt(0) === '-') {
      // handle possible short option
      let optIndex = arg.indexOf(option.shortName);
      if (optIndex !== -1) {
        // Got it, set flag
        target[optionKey] = true;

        // Remove flag from args instance - supports grouping per posix commandline spec
        arg = arg.slice(0, optIndex) + arg.slice(optIndex + 1);
        if (arg !== "-") {
          args[i] = arg;
        } else {
          // all args parsed from this element, remove it from the array
          args.splice(i, 1);
          // Back up one element - the array is shorter now.
          --i;
        }
      }
    }
  }
  return errors;
}