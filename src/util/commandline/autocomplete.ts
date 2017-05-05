import * as _ from "lodash";
import * as Path from "path";
import * as Fs from "fs";
import * as OptionDecorators from "./option-decorators";

const omelette = require("omelette");

const appName = "mobile-center";
const helpCommand = "help";
const helpCommandFile = helpCommand + ".js";

function getAutoCompleteObject() {
  return omelette(appName);
}

export function executeAutoComplete() {
  const autoCompleteObject = getAutoCompleteObject();
  autoCompleteObject.on("complete", function (fragment: string, data: { before: string, fragment: number, line: string, reply: (answer: any) => void }) {
    const line = data.line;
    const reply = data.reply;
    const argsLine = line.substring(appName.length);
    const args = argsLine.match(/\S+/g) || [];
    const rootPath = Path.normalize(Path.join(__dirname, "..", "..", "commands"));
    const lineEndsWithWhitespaceChar = /\s{1}/.test(_.last(line));
    const helpMode = _.head(args) === helpCommand;
    const pathToHelpCommand = Path.join(rootPath, helpCommandFile);
    const getReply = getReplyHandler(lineEndsWithWhitespaceChar, helpMode, pathToHelpCommand);

    reply(getReply(helpMode ? _.tail(args) : args, rootPath));
  });  
  
  autoCompleteObject.init();
}

export function setupAutoCompleteForShell(path?: string, shell?: string): any {
  const autoCompleteObject = getAutoCompleteObject();
  if (shell) {
    autoCompleteObject.shell = shell;
  } else {
    autoCompleteObject.shell = autoCompleteObject.getActiveShell();
  }

  autoCompleteObject.setupShellInitFile(path);
}

function getReplyHandler(lineEndsWithWhitespaceChar: boolean, helpMode: boolean, pathToHelpCommand: string): (args: string[], path: string) => string[] {
  return function getReply(args: string[], path: string): string[] {
    const currentArg = _.head(args);
    const currentDirEntities = Fs.readdirSync(path).filter((entry) => entry !== "lib" && entry !== "category.txt" && Path.extname(entry) !== ".map" && (!helpMode || entry !== helpCommandFile));
    const commandsAndCategoriesToEntities = new Map<string, string>(currentDirEntities.map((entity) => <[string, string]> [Path.parse(entity).name, entity]));

    if (_.isUndefined(currentArg)) {
      // no more args - show all of the items at the current level
      return Array.from(commandsAndCategoriesToEntities.keys());
    } else {
      // check what arg points to
      const entity = commandsAndCategoriesToEntities.get(currentArg);
      if (entity) {
        // arg points to an existing command or category
        const pathToEntity = Path.join(path, entity);
        const restOfArgs = _.tail(args);
        if (restOfArgs.length || lineEndsWithWhitespaceChar) {
          if (Path.extname(entity)) {
            // it is command
            const getCommandReply = getCommandReplyHandler(lineEndsWithWhitespaceChar);
            return getCommandReply(restOfArgs, getOptionNames(pathToEntity, helpMode, pathToHelpCommand));
          } else {
            // it is category
            return getReply(restOfArgs, pathToEntity);
          }
        } else {
          // if last arg has no trailing whitespace, it should be added
          return [currentArg];
        }
      } else {
        // arg points to nothing specific - return commands and categories which start with arg
        return Array.from(commandsAndCategoriesToEntities.keys()).filter((commandOrCategory) => commandOrCategory.startsWith(currentArg));
      }
    }
  };
}

function getCommandReplyHandler(lineEndsWithWhitespaceChar: boolean): (args: string[], optionNames: IOptionNames[]) => string[] {
  return function getCommandReply(args: string[], optionsNames: IOptionNames[]): string[] {  
    const currentArg = _.head(args);
    if (_.isUndefined(currentArg)) {
      // no more args, returning remaining optionsNames
      return optionsNames.map((option) => option.long || option.short);
    } else {
      const restOfArgs = _.tail(args);
      if (restOfArgs.length || lineEndsWithWhitespaceChar) {
        const filteredOptions = optionsNames.filter((option) => option.long !== currentArg && option.short !== currentArg);
        return getCommandReply(restOfArgs, filteredOptions);
      } else {
        const candidates: string[] = [];
        for (const option of optionsNames) {
          if (option.long && option.long.startsWith(currentArg)) {
            candidates.push(option.long);
          } else if (option.short && option.short.startsWith(currentArg)) {
            candidates.push(option.short);
          }
        }
        return candidates;
      }
    }
  }
}

interface IOptionNames {
  short: string;
  long: string;
}

function getOptionNames(pathToCommand: string, helpMode: boolean, pathToHelpCommand: string): IOptionNames[] {
  // loading command class
  // if help mode ("help" command is invoked), options for "help" command should be shown
  const command = require(helpMode ? pathToHelpCommand : pathToCommand).default;

  // getting command options
  const optionsDescriptionsObject = OptionDecorators.getOptionsDescription(command.prototype);
  const optionsDescriptions = Object.keys(optionsDescriptionsObject).map((key) => optionsDescriptionsObject[key]);
  return optionsDescriptions.map((option) => ({ 
    short: option.shortName ? "-" + option.shortName : null,
    long: option.longName ? "--" + option.longName : null
  }));
}
