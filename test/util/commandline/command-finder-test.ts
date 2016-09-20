import * as path from "path";
import { expect } from "chai";
import { CommandFinder } from "../../../src/util/commandline/command-finder";

describe("Finding commands", function () {
  let finder: CommandFinder;

  before(function () {
    finder = new CommandFinder(path.join(__dirname, "sample-commands"));
  });

  it("should return null if no such command exists", function () {
    const commandPath: string = finder.findCommand(["no", "such", "command"]);
    expect(commandPath).to.be.null;
  });

  it("should return path to require for existing command", function () {
    const commandPath = finder.findCommand(["cmd1"]);
    expect(commandPath).to.equal(path.join(__dirname, "sample-commands", "cmd1.ts"));
  });

  it("should fail if command includes '.' or '..'", function () {
    expect(() => finder.findCommand(["sample-commands", "..", "disatcher-test"])).to.throw(Error);
  });
});