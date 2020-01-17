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

  it("should append test_env and app_env when used multiple times", () => {
    const rawParameters = [ "key1=value1", "key2=value2", "test_env=value3", "test_env=value4", "app_env=value5", "app_env=value6" ];
    const parsedParameters = parseTestParameters(rawParameters);

    const expected = {
      key1: "value1",
      key2: "value2",
      test_env: "value3|value4",
      app_env: "value5|value6"
    };

    expect(parsedParameters).to.deep.equal(expected);
  });

  it("should refuse to append parameters other than test_env or app_env", () => {
    const rawParameters = [ "bad_env=value1", "bad_env=value2" ];
    expect(() => parseTestParameters(rawParameters))
      .to.throw(Error, "duplicate --test-parameter: bad_env");
  });
});
