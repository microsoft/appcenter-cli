import { expect } from "chai";

import {
  getOptionsDescription, getPositionalOptionsDescription, getClassHelpText,
  shortName, longName, name, defaultValue, required, hasArg, help, position,
  common
} from "../../../src/util/commandline/option-decorators";

describe("Command line option parsing", function () {
  describe("options decorators", function () {
    it("should return empty description for class without decorators", function () {
      class Sample {
        public value: string;
      }

      const source = new Sample();
      const opts = getOptionsDescription(Object.getPrototypeOf(source));
      expect(Object.keys(opts)).to.have.length(0);
    });

    it("should return correct description for one parameter", function () {
      class Sample {
        @shortName("v")
        public value: string;
      }

      const opts = getOptionsDescription(Sample.prototype);
      expect(opts).to.have.property("value");
      expect(opts["value"].shortName).to.equal("v");
    });

    it("should return correct descriptions for multiple parameters", function () {
      class Sample {
        @required
        @shortName("f")
        public flag: boolean;

        @defaultValue("this is the default")
        @shortName("v")
        @longName("value")
        public value: string;

        @longName("another")
        @hasArg
        @required
        @common
        public anotherArg: string;
      }

      const opts = getOptionsDescription(Object.getPrototypeOf(new Sample()));
      expect(opts).to.have.property("flag");
      expect(opts).to.have.property("value");
      expect(opts).to.have.property("anotherArg");

      const flagOpt = opts["flag"];
      expect(flagOpt).to.have.property("shortName", "f");
      expect(flagOpt.required).to.be.true;

      const valueOpt = opts["value"];
      expect(valueOpt).to.have.property("shortName", "v");
      expect(valueOpt).to.have.property("longName", "value");
      expect(valueOpt).to.have.property("defaultValue", "this is the default");

      const anotherOpt = opts["anotherArg"];
      expect(anotherOpt).to.have.property("longName", "another");
      expect(anotherOpt.required).to.be.true;
      expect(anotherOpt.hasArg).to.be.true;
      expect(anotherOpt.common).to.be.true;
    });

    it("should return all args for base classes", function () {
      class BaseSample {
        @shortName("h")
        @longName("help")
        public help: boolean;

        @shortName("v")
        @longName("verbose")
        @hasArg
        public logLevel: string;
      }

      class Sample extends BaseSample {
        @longName("input")
        @hasArg
        public input: string;
      }

      const opts = getOptionsDescription(Sample.prototype);
      expect(Object.keys(opts)).to.include("help")
        .and.to.include("logLevel")
        .and.to.include("input");
    });

    it("should return help string for command", function () {

      @help("This is the help text")
      class SampleWithHelp {
      }

      const text = getClassHelpText(SampleWithHelp);
      expect(text).to.equal("This is the help text");
    });

    it("should create correct description for rest option", function () {
      class Sample {
        @name("rest")
        @position(null)
        public rest: string[];
      }

      const opts = getPositionalOptionsDescription(Sample.prototype);
      expect(opts).to.be.instanceof(Array).and.to.have.lengthOf(1);
    });
  });
});
