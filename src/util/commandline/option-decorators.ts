import { OptionsDescription, OptionDescription, PositionalOptionsDescription, PositionalOptionDescription } from "./option-parser";
import { inspect } from "util";

const debug = require("debug")("sonoma-cli:util:commandline:option-decorators");

const optionDescriptionKey = Symbol("OptionParameters");
const positionalDescriptionKey = Symbol("PositionalParameters");
const unknownRequiredsKey = Symbol("UnknownRequireds");
const unknownDefaultValueKey = Symbol("UnknownDefaultValues");
const unknownHelpTextKey = Symbol("UnknownDescription");


export const classHelpTextKey = Symbol("ClassHelpText");

export function getOptionsDescription(target: any): OptionsDescription {
  if (target[optionDescriptionKey] === undefined) {
    target[optionDescriptionKey] = {};
  }
  return target[optionDescriptionKey];
}

export function getPositionalOptionsDescription(target: any): PositionalOptionsDescription {
  if (target[positionalDescriptionKey] === undefined) {
    target[positionalDescriptionKey] = [];
  }
  return target[positionalDescriptionKey];
}

export function getClassHelpText(target: any): string {
  return target[classHelpTextKey];
}

interface PropertyDecorator {
  (proto: any, propertyKey: string | Symbol): void;
}

type ClassDecorator = <TFunction extends Function>(target: TFunction) => TFunction | void;

interface PropertyDecoratorBuilder<T> {
  (input: T): PropertyDecorator;
}

function updateUnknownRequireds(option: OptionDescription | PositionalOptionDescription, propertyKey: string, proto: any) {
  if (proto[unknownRequiredsKey] && proto[unknownRequiredsKey].has(propertyKey)) {
    option.required = true;
    proto[unknownRequiredsKey].delete(propertyKey);
  }
}

function updateUnknownDefaultValues(option: OptionDescription | PositionalOptionDescription, propertyKey: string, proto: any) {
  if (proto[unknownDefaultValueKey] && proto[unknownDefaultValueKey].has(propertyKey)) {
    option.defaultValue = proto[unknownDefaultValueKey].get(propertyKey);
    proto[unknownDefaultValueKey].delete(propertyKey);
  }
}

function updateUnknownHelpTexts(option: OptionDescription | PositionalOptionDescription, propertyKey: string, proto: any) {
  if (proto[unknownHelpTextKey] && proto[unknownHelpTextKey].has(propertyKey)) {
    option.helpText = proto[unknownHelpTextKey].get(propertyKey);
    proto[unknownHelpTextKey].delete(propertyKey);
  }
}

function updateUnknowns(option: OptionDescription | PositionalOptionDescription, propertyKey: string, proto: any) {
  updateUnknownRequireds(option, propertyKey, proto);
  updateUnknownDefaultValues(option, propertyKey, proto);
  updateUnknownHelpTexts(option, propertyKey, proto);
}

function makeStringDecorator(descriptionFieldName: string): PropertyDecoratorBuilder<string> {
  return function decoratorBuilder(name: string): PropertyDecorator {
    return function paramDecorator(proto: any, propertyKey: string): void {
      let optionsDescription = getOptionsDescription(proto);
      let option = optionsDescription[propertyKey] || {};
      (<any>option)[descriptionFieldName] = name;
      updateUnknowns(option, propertyKey, proto);
      optionsDescription[propertyKey] = option;
    };
  };
}

function makeBoolDecorator(descriptionFieldName: string): PropertyDecorator {
  return function paramDecorator(proto: any, propertyKey: string): void {
      let optionsDescription = getOptionsDescription(proto);
      let option = optionsDescription[propertyKey] || {};
      (<any>option)[descriptionFieldName] = true;
      updateUnknowns(option, propertyKey, proto);
      optionsDescription[propertyKey] = option;
  };
}

// Short and long name decorators
export const shortName = makeStringDecorator("shortName");
export const longName = makeStringDecorator("longName");

export const hasArg = makeBoolDecorator("hasArg");

function makePositionalDecorator<T>(descriptionFieldName: string): PropertyDecoratorBuilder<T> {
  return function positionalDecoratorBuilder(value: T): PropertyDecorator {
    return function positionalDecorator(proto: any, propertyKey: string): void {
      let optionsDescription = getPositionalOptionsDescription(proto);
      let option = optionsDescription.find(opt => opt.propertyName === propertyKey);
      if (option === undefined) {
        option = { propertyName: propertyKey, name: "", position: -1 };
        optionsDescription.push(option);
        updateUnknowns(option, propertyKey, proto);
      }
      (<any>option)[descriptionFieldName] = value;
    };
  };
}

export const position = makePositionalDecorator<number>("position");
export const name = makePositionalDecorator<string>("name");

//
// Logic or handling decorators that apply to both positional and
// flag arguments. Needs to be slightly special since we may not
// know which one the parameter is until a later decorator runs.
//
function saveDecoratedValue(proto: any, propertyKey: string | Symbol, descriptionProperty: string, value: any, unknownFieldKey: Symbol) {
    let flagOpts: any = getOptionsDescription(proto);
    if (flagOpts.hasOwnProperty(propertyKey.toString())) {
      flagOpts[propertyKey.toString()][descriptionProperty] = value;
      return;
    }

    let positionalOpts: any[] = getPositionalOptionsDescription(proto);
    let opt = positionalOpts.find(opt => opt.propertyName === propertyKey);
    if (opt !== undefined) {
      opt[descriptionProperty] = value;
      return;
    }

    let unknownValues = proto[<any>unknownFieldKey] = proto[<any>unknownFieldKey] || new Map<string, string>();
    unknownValues.set(propertyKey.toString(), value);
}

// Required is special, since it has to work on both flag and positional parameters.
// If it's the first decorator, stick name in a set to check later once we know
// which one it is
export function required(proto: any, propertyKey: string): void {
  saveDecoratedValue(proto, propertyKey, "required", true, unknownRequiredsKey);
}

// DefaultValue is also special, since it has to work with both as well. Same
// basic logic
export function defaultValue(value: string): PropertyDecorator {
  return function defaultValueDecorator(proto: any, propertyKey: string): void {
    saveDecoratedValue(proto, propertyKey, "defaultValue", value, unknownDefaultValueKey);
  };
}

// Decorator factory to give a consolidated helptext API across class & parameter
export function help(helpText: string) : {(...args: any[]): any} {
  return function helpDecoratorFactory(...args: any[]): any {
    debug(`@help decorator called with ${args.length} arguments: ${inspect(args)}`);
    if (args.length === 1) {
      let ctor = args[0];
      ctor[classHelpTextKey] = helpText;
      return ctor;
    }

    // Typescript docs are incorrect - property decorators get three args, and the last one is
    // undefined
    if (args.length === 3 && typeof args[0] === "object" && args[2] === undefined) {
      let proto = args[0];
      let propertyName = <string>args[1];
      return saveDecoratedValue(proto, propertyName, "helpText", help, unknownHelpTextKey);
    }
    throw new Error("@help not valid in this location");
  };
}
