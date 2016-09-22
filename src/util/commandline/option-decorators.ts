import { OptionsDescription, OptionDescription } from "./option-parser";

export const optionParametersKey = Symbol("OptionParameters");
export const positionalParametersKey = Symbol("PositionalParameters");

export function getOptionsDescription(target: any): OptionsDescription {
  if (target[optionParametersKey] === undefined) {
    target[optionParametersKey] = {};
  }
  return <OptionsDescription>target[optionParametersKey];
}

interface PropertyDecorator {
  (proto: any, propertyKey: string): void;
}

interface StringPropertyDecoratorBuilder {
  (descriptionFieldName: string): PropertyDecorator;
}

interface BoolPropertyDecoratorBuilder {
  (descriptionFieldName: string): PropertyDecorator;
}

function makeStringDecorator(descriptionFieldName: string): StringPropertyDecoratorBuilder {
  return function decoratorBuilder(name: string): PropertyDecorator {
    return function paramDecorator(proto: any, propertyKey: string): void {
      let optionsDescription = getOptionsDescription(proto);
      let option = optionsDescription[propertyKey] || {};
      (<any>option)[descriptionFieldName] = name;
      optionsDescription[propertyKey] = option;
    };
  };
}

function makeBoolDecorator(descriptionFieldName: string): PropertyDecorator {
  return function paramDecorator(proto: any, propertyKey: string): void {
      let optionsDescription = getOptionsDescription(proto);
      let option = optionsDescription[propertyKey] || {};
      (<any>option)[descriptionFieldName] = true;
      optionsDescription[propertyKey] = option;
  };
}

// Short and long name decorators
export const shortName = makeStringDecorator("shortName");
export const longName = makeStringDecorator("longName");
export const defaultValue = makeStringDecorator("defaultValue");

// Required just sets a flag
export const required = makeBoolDecorator("required");
export const hasArg = makeBoolDecorator("hasArg");
