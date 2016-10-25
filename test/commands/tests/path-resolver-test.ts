import { PathResolver } from "../../../src/commands/tests/lib/path-resolver";
import { expect } from "chai";
const path = require('path');

function normalizePaths(paths: string[]): string[] {    
  return paths.map(p => p.replace(new RegExp("/", 'g'), path.sep)).sort();
}

function verifyResult(actual: string[], expected: string[]) {
  let normalizedExpected = normalizePaths(expected);
  let normalizedActual = normalizePaths(actual);
  expect(normalizedActual).to.eql(normalizedExpected);
}

describe("Resolving paths", function() {
  let pathResolver: PathResolver;

  before(() => {
    pathResolver = new PathResolver("./test/commands/tests/sample-test-workspace");
  });

  it("should resolve single file", async () => {
    let result = await pathResolver.resolve("lib/tests.rb");
    verifyResult(result, ["lib/tests.rb"]);
  });

  it("should resolve all files in directory", async () => {
    let result = await pathResolver.resolve("resources/");
    verifyResult(
      result, 
      [ 
        "resources/pl-PL/messages.csv",
        "resources/messages.csv",
        "resources/ReadMe.txt"
      ]
    )
  });

  it("should resolve files with asterisk (*)", async () => {
    let result = await pathResolver.resolve("resources/*");
    verifyResult(
      result,
      [
        "resources/messages.csv",
        "resources/ReadMe.txt"
      ]);
  });

  it("should resolve files with double asterisk (**)", async () => {
    let result = await pathResolver.resolve("**/*.csv");
    verifyResult(
      result,
      [
        "resources/messages.csv",
        "resources/pl-PL/messages.csv"
      ]);
  });

  it("should reject files outside of workspace", async() => {
    let failed = false;
    try {
      await pathResolver.resolve("../path-resolver-test.ts");
    }
    catch (Error) {
      failed = true;
    }

    expect(failed).to.true;
  });

  it("should reject not existing file", async() => {
    let failed = false;
    try {
      await pathResolver.resolve("not_existing_file_or_dir");
    }
    catch (Error) {
      failed = true;
    }

    expect(failed).to.true;
  });

  it("should return all files for multiple patterns", async() => {
    let result = await pathResolver.resolve(["**/*.csv", "**/*.rb", "lib"]);
    verifyResult(
      result,
      [
        "lib/tests.rb",
        "resources/messages.csv",
        "resources/pl-PL/messages.csv"
      ]);
  });
});