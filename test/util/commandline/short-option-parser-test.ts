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
      let result = parseOptions(opts, target, args);
      expect(result).to.be.null;
      expect(args).to.have.lengthOf(0);
      expect(target.singleFlag).to.be.true;
    });

    it("should succeed parsing when optional flag not present", function() {
      let target: any = {};
      let args: string[] = [];
      let result = parseOptions(opts, target, args);
      expect(result).to.be.null;
      expect(args).to.have.lengthOf(0);
      expect(target).to.not.have.property("singleFlag");
    });

    it("should leave unparsed args in array", function () {
      let target: any = {};
      let args = [ "-a", "-b", "-c" ];
      let result = parseOptions(opts, target, args);
      expect(result).to.be.null;
      expect(args).to.have.lengthOf(2);
      expect(args).to.contain("-b").and.to.contain("-c");
    });

    it("should detect argument when groups with others", function () {
      let target: any = {};
      let args = [ "-bca" ];
      let result = parseOptions(opts, target, args);
      expect(result).to.be.null;
      expect(args).to.have.lengthOf(1);
      expect(args[0]).to.equal("-bc");
    });
  });
});