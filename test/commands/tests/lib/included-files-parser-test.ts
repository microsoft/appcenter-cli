import { expect } from "chai";
import { parseIncludedFiles } from "../../../../src/commands/tests/lib/included-files-parser";

describe("parseIncludedFiles", () => {
  it("should parse included files", () => {
    let rawIncludedFiles = [ "data\\foo=d:\\Temp\\Data", "data/bar=/tmp/test-data" ];
    let parsedIncludedFiles = parseIncludedFiles(rawIncludedFiles);

    let expected = [
      {
        "targetPath": "data\\foo",
        "sourcePath": "d:\\Temp\\Data"
      },
      {
        "targetPath": "data/bar",
        "sourcePath": "/tmp/test-data"
      }
    ];

    expect(parsedIncludedFiles).to.deep.equal(expected);
  });
});