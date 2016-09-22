import * as path from "path";
import { expect } from "chai";
import { CommandFinder, finder } from "../../../src/util/commandline/command-finder";

describe("Finding commands", function () {
  let commandFinder: CommandFinder;

  before(function () {
    commandFinder = finder(path.join(__dirname, "sample-commands"));
  });

  it("should return null if no such command exists", function () {
    const result = commandFinder(["no", "such", "command"]);
    expect(result).to.be.null;
  });

  it("should return path to require for existing command", function () {
    const result = commandFinder(["cmd1"]);
    expect(result.commandPath).to.equal(path.join(__dirname, "sample-commands", "cmd1.ts"));
  });

  it("should fail if command includes '.' or '..'", function () {
    expect(() => commandFinder(["sample-commands", "..", "disatcher-test"])).to.throw(Error);
  });

  it("should ignore additional illegal parameters until finding command", function () {
    const result = commandFinder("cmd1 file.txt other/txt".split(" "));
    expect (result.commandPath).to.equal(path.join(__dirname, "sample-commands", "cmd1.ts"));
  });
});