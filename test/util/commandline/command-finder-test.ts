import * as path from "path";
import { expect } from "chai";
import { CommandFinder, finder } from "../../../src/util/commandline/command-finder";

describe("Finding commands", function () {
  let commandFinder: CommandFinder;

  before(function () {
    commandFinder = finder(path.join(__dirname, "sample-commands"));
  });

  it("should return not found if no such command exists", function () {
    const commandLine = "no such command".split(" ");
    const result = commandFinder(commandLine);
    expect(result).to.have.property("found", false);
  });

  it("should command parts that were not found if no command exists", function () {
    const commandLine = "no such command".split(" ");
    const result = commandFinder(commandLine);
    expect(result.commandParts).to.have.lengthOf(3);
    commandLine.forEach((part, index) => {
      expect(result.commandParts[index]).to.equal(part);
    });
  });

  it("should return path to require for existing command", function () {
    const result = commandFinder(["cmd1"]);
    expect(result.commandPath).to.equal(path.join(__dirname, "sample-commands", "cmd1.ts"));
  });

  it("should fail if command includes '.' or '..'", function () {
    const commandLine = "sample-commands .. disatcher-test".split(" ");
    const result = commandFinder(commandLine);
    expect(result).to.have.property("found", false);
    expect(result.commandParts).to.have.lengthOf(commandLine.length);
    commandLine.forEach((part, index) => { expect(result.commandParts[index]).to.equal(part); });
  });

  it("should ignore additional illegal parameters until finding command", function () {
    const result = commandFinder("cmd1 file.txt other/txt".split(" "));
    expect(result.commandPath).to.equal(path.join(__dirname, "sample-commands", "cmd1.ts"));
  });

  it("should return command line flags without command name", function () {
    const commandLine = "cmd1 -f stuff.txt".split(" ");
    const result = commandFinder(commandLine);
    expect(result.unusedArgs).to.have.length(2);
    expect(result.unusedArgs[0]).to.equal(commandLine[1]);
    expect(result.unusedArgs[1]).to.equal(commandLine[2]);
  });

  it("should back up command line until finding command", function () {
    const commandLine = "cmd1 foo bar baz -x -y z".split(" ");
    const result = commandFinder(commandLine);
    expect(result.commandPath).to.equal(path.join(__dirname, "sample-commands", "cmd1.ts"));
    expect(result.unusedArgs).to.have.lengthOf(commandLine.length - 1);
    for (let i = 0; i < commandLine.length - 1; ++i) {
      expect(result.unusedArgs[i]).to.equal(commandLine[i + 1]);
    }
  });

  it("should return category found if command is directory", function () {
    const commandLine = ["subcommands"];
    const result = commandFinder(commandLine);
    expect(result.found).to.be.true;
    expect(result.isCategory).to.be.true;
    expect(result.commandParts).to.have.lengthOf(1);
    expect(result.commandParts[0]).to.equal("subcommands");
  });

  it("should not find command if in lib directory", function () {
    const commandLine = "subcommands lib nogood".split(" ");
    const result = commandFinder(commandLine);
    expect(result.found).to.be.true;
    expect(result.isCategory).to.be.true;
    expect(result.commandParts).to.have.lengthOf(1);
    expect(result.commandParts[0]).to.equal(commandLine[0]);
  });

  it("should return category command for root if no command given", function () {
    const commandLine = "".split(" ");
    const result = commandFinder(commandLine);
    expect(result.found).to.be.true;
    expect(result.isCategory).to.be.true;
    expect(result.commandParts).to.have.lengthOf(0);
  });

  it("should find command for command with dash in name", function () {
    const commandLine = "subcommands dashed-command".split(" ");
    const result = commandFinder(commandLine);
    expect(result.found).to.be.true;
    expect(result.isCategory).to.be.false;
    expect(result.commandParts).to.have.lengthOf(2);
    expect(result.commandParts[0]).to.equal("subcommands");
    expect(result.commandParts[1]).to.equal("dashed-command");
  });
});
