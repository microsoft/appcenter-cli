import { expect } from "chai";

import { parseOptions, OptionsDescription, PositionalOptionsDescription } from "../../../src/util/commandline/option-parser";

describe("Command line option parsing", function () {

  describe("single option", function () {
    const opts: OptionsDescription = {
      singleFlag: {
        shortName: "a",
        longName: "a-flag",
        required: false
      }
    };

    it("should parse single flag correctly when flag is present", function () {
      const target: any = {};
      const args = [ "-a" ];
      parseOptions(opts, target, args);
      expect(target).to.have.property("singleFlag", true);
    });

    it("should succeed parsing when optional flag not present", function () {
      const target: any = {};
      const args: string[] = [];
      parseOptions(opts, target, args);
      expect(target).to.have.property("singleFlag", false);
    });

    it("should parse long option flag when present", function () {
      const target: any = {};
      const args = [ "--a-flag" ];
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
      optionWithArg: {
        shortName: "a",
        longName: "with-arg",
        hasArg: true
      }
    };

    it("should read argument from next arg if separate", function () {
      const target: any = {};
      const args = [ "-a", "argValue" ];
      parseOptions(opts, target, args);
      expect(target).to.have.property("optionWithArg", "argValue");
    });
  });

  describe("required option", function () {
    const opts: OptionsDescription = {
      req: {
        shortName: "r",
        longName: "required",
        hasArg: true,
        required: true
      }
    };

    it("should parse correctly when present", function () {
      const target = {};
      parseOptions(opts, target, ["-r", "stuff"]);
      expect(target).to.have.property("req", "stuff");
    });

    it("should throw if required argument is not given", function () {
      const target = {};
      expect(() => parseOptions(opts, target, []))
        .to.throw(/missing required option/i);
    });
  });

  describe("option with default value", function () {
    const opts: OptionsDescription = {
      def: {
        shortName: "d",
        defaultValue: "defined",
        hasArg: true,
      }
    };

    it("should take command line option if given", function () {
      const target: any = {};
      parseOptions(opts, target, "-d specificValue".split(" "));
      expect(target).to.have.property("def", "specificValue");
    });

    it("should return default value if not in arguments", function () {
      const target: any = {};
      parseOptions(opts, target, []);
      expect(target).to.have.property("def", "defined");
    });
  });

  describe("multiple options", function () {
    const opts: OptionsDescription = {
      flag: {
        shortName: "f",
        longName: "flag"
      },
      input: {
        shortName: "i",
        longName: "input",
        required: true,
        hasArg: true
      },
      output: {
        longName: "out",
        hasArg: true,
        defaultValue: "out.dat"
      }
    };

    it("should parse all options if all present", function () {
      const target: any = {};
      parseOptions(opts, target, "-i in.txt -f --out=myFile.txt".split(" "));
      expect(target).to.have.property("flag", true);
      expect(target).to.have.property("input", "in.txt");
      expect(target).to.have.property("output", "myFile.txt");
    });

    it("should return default values for options not present", function () {
      const target: any = {};
      parseOptions(opts, target, "-f --input myfile.txt".split(" "));
      expect(target).to.have.property("flag", true);
      expect(target).to.have.property("input", "myfile.txt");
      expect(target).to.have.property("output", "out.dat");
    });

    it("should throw if required option missing", function () {
      const target: any = {};
      expect(() => parseOptions(opts, target, "--out foo.txt".split(" ")))
        .to.throw(/missing required option -i \/ --input/i);
    });
  });

  describe("positional options", function () {

    it("should parse single positional argument", function () {
      const opts: PositionalOptionsDescription = [
        {
          name: "inputFile",
          propertyName: "file",
          position: 0,
          required: true
        }
      ];

      const target: any = {};
      parseOptions({}, opts, target, "input.txt".split(" "));
      expect(target).to.have.property("file", "input.txt");
    });

    it ("should throw when required positional argument is missing", function () {
      const opts: PositionalOptionsDescription = [
        {
          name: "inputFile",
          propertyName: "file",
          position: 0,
          required: true
        }
      ];

      const target: any = {};
      expect(() => parseOptions({}, opts, target, []))
        .to.throw(/missing required positional argument inputFile/i);
    });

    it ("should populate rest option", function () {
      const opts: PositionalOptionsDescription = [
        {
          name: "inputFile",
          propertyName: "file",
          position: 0
        },
        {
          name: "moreFiles",
          propertyName: "moreFiles",
          position: null
        }
      ];

      const target: any = {};
      parseOptions({}, opts, target, "a.txt b.txt c.txt".split(" "));

      expect(target).to.have.property("file", "a.txt");
      expect(target).to.have.property("moreFiles")
        .and.to.be.instanceof(Array)
        .and.to.have.lengthOf(2);
      expect(target.moreFiles[0]).to.equal("b.txt");
      expect(target.moreFiles[1]).to.equal("c.txt");
    });

    it("should not assign missing optional positionals", function () {
      const opts: PositionalOptionsDescription = [
        {
          name: "file",
          propertyName: "file",
          position: 0,
          required: true
        },
        {
          name: "moreFiles",
          propertyName: "moreFiles",
          position: 1,
          required: false
        }
      ];

      const target: any = {};
      parseOptions({}, opts, target, "a.txt".split(" "));

      expect(target).to.have.property("file", "a.txt");
      expect(target).to.not.have.property("moreFiles");
    });

    it("should throw if there are extra positional args and no rest arg", function () {
      const opts: PositionalOptionsDescription = [
        {
          name: "file",
          propertyName: "file",
          position: 0,
          required: true
        }
      ];

      const target: any = {};
      expect(() => parseOptions({}, opts, target, "a.txt b.txt".split(" ")))
        .to.throw(Error, /Unknown arguments: b.txt/);
    });
  });

  describe("flags and positional together", function () {
    it("should parse as expected", function () {
      const flagOpts: OptionsDescription = {
        verbose: {
          shortName: "v",
          longName: "verbose"
        },
        format: {
          shortName: "f",
          longName: "format",
          hasArg: true
        }
      };

      const positionOpts: PositionalOptionsDescription = [
        {
          name: "inputFile",
          propertyName: "inputFile",
          position: 0
        },
        {
          name: "configFile",
          propertyName: "configFile",
          position: 1
        }
      ];

      const target: any = {};
      parseOptions(flagOpts, positionOpts, target, "in.txt -v conf.json --format=csv".split(" "));

      expect(target).to.have.property("verbose", true);
      expect(target).to.have.property("format", "csv");
      expect(target).to.have.property("inputFile", "in.txt");
      expect(target).to.have.property("configFile", "conf.json");
    });
  });
});
