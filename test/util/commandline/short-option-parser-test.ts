import { expect } from "chai";

import { parseOptions, OptionsDescription } from "../../../src/util/commandline/option-parser";

describe("Command line option parsing", function() {

  describe("single option", function () {
    const opts: OptionsDescription = {
      "singleFlag": {
        shortName: "a",
        longName: "a-flag",
        required: false
      }
    };

    it("should parse single flag correctly when flag is present", function () {
      let target: any = {};
      let args = [ "-a" ];
      parseOptions(opts, target, args);
      expect(target).to.have.property("singleFlag", true);
    });

    it("should succeed parsing when optional flag not present", function() {
      let target: any = {};
      let args: string[] = [];
      parseOptions(opts, target, args);
      expect(target).to.have.property("singleFlag", false);
    });

    it("should parse long option flag when present", function () {
      let target: any = {};
      let args = [ "--a-flag" ];
      parseOptions(opts, target, args);
      expect(target).to.have.property("singleFlag", true);
    });

    it("should throw on unknown argument", function () {
      expect(() => parseOptions(opts, {}, ["-x"]))
        .to.throw(/unknown argument/i);
    });
  });

  describe("single option with argument", function () {

    const opts: OptionsDescription = {
      "optionWithArg": {
        shortName: "a",
        longName: "with-arg",
        hasArg: true
      }
    };

    it("should read argument from next arg if separate", function () {
      let target: any = {};
      let args = [ "-a", "argValue" ];
      parseOptions(opts, target, args);
      expect(target).to.have.property("optionWithArg", "argValue");
    });
  });

  describe("required option", function () {
    const opts: OptionsDescription = {
      "req": {
        shortName: "r",
        longName: "required",
        hasArg: true,
        required: true
      }
    };

    it("should parse correctly when present", function () {
      let target = {};
      parseOptions(opts, target, ["-r", "stuff"]);
      expect(target).to.have.property("req", "stuff");
    });

    it("should throw if required argument is not given", function () {
      let target = {};
      expect(() => parseOptions(opts, target, []))
        .to.throw(/missing required option/i);
    });
  });

  describe("option with default value", function () {
    const opts: OptionsDescription = {
      "def": {
        shortName: "d",
        defaultValue: "defined",
        hasArg: true,
      }
    };

    it("should take command line option if given", function () {
      let target: any = {};
      parseOptions(opts, target, "-d specificValue".split(" "));
      expect(target).to.have.property("def", "specificValue");
    });

    it("should return default value if not in arguments", function () {
      let target: any = {};
      parseOptions(opts, target, []);
      expect(target).to.have.property("def", "defined");
    });
  });

  describe("multiple options", function () {
    const opts: OptionsDescription = {
      "flag": {
        shortName: "f",
        longName: "flag"
      },
      "input": {
        shortName: "i",
        longName: "input",
        required: true,
        hasArg: true
      },
      "output": {
        longName: "out",
        hasArg: true,
        defaultValue: "out.dat"
      }
    };

    it("should parse all options if all present", function () {
      let target: any = {};
      parseOptions(opts, target, "-i in.txt -f --out=myFile.txt".split(" "));
      expect(target).to.have.property("flag", true);
      expect(target).to.have.property("input", "in.txt");
      expect(target).to.have.property("output", "myFile.txt");
    });

    it("should return default values for options not present", function () {
      let target: any = {};
      parseOptions(opts, target, "-f --input myfile.txt".split(" "));
      expect(target).to.have.property("flag", true);
      expect(target).to.have.property("input", "myfile.txt");
      expect(target).to.have.property("output", "out.dat");
    });

    it("should throw if required option missing", function () {
      let target: any = {};
      expect(() => parseOptions(opts, target, "--out foo.txt".split(" ")))
        .to.throw(/missing required option i/i);
    });
  });
});
