import { expect } from "chai";

import { OptionsDescription, OptionDescription } from "../../../src/util/commandline/option-parser";
import { getOptionsDescription, getClassHelpText, shortName, longName, defaultValue, required, hasArg, help } from "../../../src/util/commandline/option-decorators";

describe("Command line option parsing", function () {
  describe("Options decorators", function() {
    it("should return empty description for class without decorators", function () {
      class Sample {
        public value: string;
      };

      let source = new Sample();
      let opts = getOptionsDescription(Object.getPrototypeOf(source));
      expect(Object.keys(opts)).to.have.length(0);
    });

    it("should return correct description for one parameter", function () {
      class Sample {
        @shortName("v")
        public value: string;
      };

      let opts = getOptionsDescription(Sample.prototype);
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
        public anotherArg: string;
      };

      let opts = getOptionsDescription(Object.getPrototypeOf(new Sample()));
      expect(opts).to.have.property("flag");
      expect(opts).to.have.property("value");
      expect(opts).to.have.property("anotherArg");

      let flagOpt = opts["flag"];
      expect(flagOpt).to.have.property("shortName", "f");
      expect(flagOpt.required).to.be.true;

      let valueOpt = opts["value"];
      expect(valueOpt).to.have.property("shortName", "v");
      expect(valueOpt).to.have.property("longName", "value");
      expect(valueOpt).to.have.property("defaultValue", "this is the default");

      let anotherOpt = opts["anotherArg"];
      expect(anotherOpt).to.have.property("longName", "another");
      expect(anotherOpt.required).to.be.true;
      expect(anotherOpt.hasArg).to.be.true;
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

      let opts = getOptionsDescription(Sample.prototype);
      expect(Object.keys(opts)).to.include("help")
        .and.to.include("logLevel")
        .and.to.include("input");
    });

  it("should return help string for command", function () {

    @help("This is the help text")
    class SampleWithHelp {
    }

    const text = getClassHelpText(SampleWithHelp.prototype);
    expect(text).to.equal("This is the help text");
  });
});
