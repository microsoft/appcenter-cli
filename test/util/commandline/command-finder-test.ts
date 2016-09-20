import * as path from "path";
import { expect } from "chai";
import { CommandFinder, finder } from "../../../src/util/commandline/command-finder";

describe("Finding commands", function () {
  let commandFinder: CommandFinder;

  before(function () {
    commandFinder = finder(path.join(__dirname, "sample-commands"));
  });

  it("should return null if no such command exists", function () {
    const commandPath: string = commandFinder(["no", "such", "command"]);
    expect(commandPath).to.be.null;
  });

  it("should return path to require for existing command", function () {
    const commandPath = commandFinder(["cmd1"]);
    expect(commandPath).to.equal(path.join(__dirname, "sample-commands", "cmd1.ts"));
  });

  it("should fail if command includes '.' or '..'", function () {
    expect(() => commandFinder(["sample-commands", "..", "disatcher-test"])).to.throw(Error);
  });
});