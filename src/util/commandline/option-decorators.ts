import { OptionsDescription, OptionDescription, PositionalOptionsDescription, PositionalOptionDescription } from "./option-parser";

const optionDescriptionKey = Symbol("OptionParameters");
const positionalDescriptionKey = Symbol("PositionalParameters");
const unknownRequiredsKey = Symbol("UnknownRequireds");
const unknownDefaultValueKey = Symbol("UnknownDefaultValues");

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

interface PropertyDecorator {
  (proto: any, propertyKey: string): void;
}

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

function updateUnknowns(option: OptionDescription | PositionalOptionDescription, propertyKey: string, proto: any) {
  updateUnknownRequireds(option, propertyKey, proto);
  updateUnknownDefaultValues(option, propertyKey, proto);
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

// Required is special, since it has to work on both flag and positional parameters.
// If it's the first decorator, stick name in a set to check later once we know
// which one it is
export function required(proto: any, propertyKey: string): void {
  let flagOpts = getOptionsDescription(proto);
  if (flagOpts.hasOwnProperty(propertyKey)) {
    flagOpts[propertyKey].required = true;
    return;
  }

  let positionalOpts = getPositionalOptionsDescription(proto);
  let opt = positionalOpts.find(opt => opt.propertyName === propertyKey);
  if (opt !== undefined) {
    opt.required = true;
    return;
  }

  let unknownRequireds = proto[unknownRequiredsKey] = proto[unknownRequiredsKey] || new Set();
  unknownRequireds.add(propertyKey);
}

// DefaultValue is also special, since it has to work with both as well. Same
// basic logic
export function defaultValue(value: string): PropertyDecorator {
  return function defaultValueDecorator(proto: any, propertyKey: string): void {
    let flagOpts = getOptionsDescription(proto);
    if (flagOpts.hasOwnProperty(propertyKey)) {
      flagOpts[propertyKey].defaultValue = value;
      return;
    }

    let positionalOpts = getPositionalOptionsDescription(proto);
    let opt = positionalOpts.find(opt => opt.propertyName === propertyKey);
    if (opt !== undefined) {
      opt.defaultValue = value;
      return;
    }

    let unknownDefaultValues = proto[unknownDefaultValueKey] = proto[unknownDefaultValueKey] || new Map<string, string>();
    unknownDefaultValues.set(propertyKey, value);
  };
}
