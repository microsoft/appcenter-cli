import { expect } from "chai";
import { parseTestParameters } from "../../../../src/commands/test/lib/parameters-parser";

describe("parseTestParameters", () => {
  it("should parse arguments with values", () => {
    const rawParameters = [ "key1=value1", "key2=value2" ];
    const parsedParameters = parseTestParameters(rawParameters);

    const expected = {
      key1: "value1",
      key2: "value2"
    };

    expect(parsedParameters).to.deep.equal(expected);
  });

  it("should parse arguments without values", () => {
    const rawParameters = [ "key1", "key2" ];
    const parsedParameters = parseTestParameters(rawParameters);

    const expected: any = {
      key1: null,
      key2: null
    };

    expect(parsedParameters).to.deep.equal(expected);
  });
});
