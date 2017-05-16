import * as Path from "path";
import * as Fs from "fs";

const omelette = require("omelette");

const appName = "mobile-center";

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
    const lineEndsWithWhitespaceChar = /\s{1}/.test(last(line));
    const autocompleteTree = JSON.parse(Fs.readFileSync(Path.join(__dirname, "..", "..", "autocomplete-tree.json"), "utf8")) as IAutocompleteTree;
    const expandedAutoCompleteTree = getAutoCompleteTreeWithExpandedHelp(autocompleteTree);
    const getReply = getReplyHandler(lineEndsWithWhitespaceChar);

    reply(getReply(args, expandedAutoCompleteTree));
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

function getReplyHandler(lineEndsWithWhitespaceChar: boolean): (args: string[], autocompleteTree: IAutocompleteTree) => string[] {
  return function getReply(args: string[], autocompleteTree: IAutocompleteTree): string[] {
    const currentArg = head(args);
    const commandsAndCategories = Object.keys(autocompleteTree);

    if (currentArg === undefined) {
      // no more args - show all of the items at the current level
      return commandsAndCategories;
    } else {
      // check what arg points to
      const entity = autocompleteTree[currentArg];
      if (entity) {
        // arg points to an existing command or category
        const restOfArgs = tail(args);
        if (restOfArgs.length || lineEndsWithWhitespaceChar) {
          if (entity instanceof Array) {
            // it is command
            const getCommandReply = getCommandReplyHandler(lineEndsWithWhitespaceChar);
            return getCommandReply(restOfArgs, entity);
          } else {
            // it is category
            return getReply(restOfArgs, entity);
          }
        } else {
          // if last arg has no trailing whitespace, it should be added
          return [currentArg];
        }
      } else {
        // arg points to nothing specific - return commands and categories which start with arg
        return commandsAndCategories.filter((commandOrCategory) => commandOrCategory.startsWith(currentArg));
      }
    }
  };
}

function getCommandReplyHandler(lineEndsWithWhitespaceChar: boolean): (args: string[], optionNames: IOptionNames[]) => string[] {
  return function getCommandReply(args: string[], optionsNames: IOptionNames[]): string[] {  
    const currentArg = head(args);
    if (currentArg === undefined) {
      // no more args, returning remaining optionsNames
      return optionsNames.map((option) => option.long || option.short);
    } else {
      const restOfArgs = tail(args);
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
  };
}

interface IOptionNames {
  short?: string;
  long?: string;
}

interface IAutocompleteTree {
  [entity: string]: IAutocompleteTree | IOptionNames[];
}

function getAutoCompleteTreeWithExpandedHelp(originalTree: IAutocompleteTree): IAutocompleteTree {
  // "help" command prefixes command path to show help for it
  const helpTree = cloneDeep(originalTree, (entry) => entry instanceof Array ? cloneDeep(originalTree["help"]) : undefined);
  delete helpTree["help"];

  const expandedTree = cloneDeep(originalTree);  
  expandedTree["help"] = helpTree;

  return expandedTree;
}

// utility functions (to avoid loading lodash for performance reasons)

function last(line: string): string {
  return line.substr(-1, 1);
}

function head<T>(array: T[]): T {
  return array[0];
}

function tail<T>(array: T[]): T[] {
  return array.slice(1);
}

function cloneDeep<T>(item: T): T;
function cloneDeep(item: any, handler: (item: any) => any): any;
function cloneDeep(...args: any[]): any {
  const item = args[0];
  const handler = args[1];
  const handlerResult = handler && handler(item);
  if (handlerResult !== undefined) {
    return handlerResult;
  }

  if (item instanceof Array) {
    return item.map((subItem) => cloneDeep(subItem, handler));
  }

  if (item instanceof Object) {
    const cloneObject: {[key: string]: any} = {};
    const keys = Object.keys(item);
    for (const key of keys) {
      cloneObject[key] = cloneDeep(item[key], handler);
    }
    return cloneObject;
  }

  return item;
}
