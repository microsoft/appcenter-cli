import * as path from "path";

import { expect } from "chai";
import * as sinon from "sinon";

// Force require of Commandline module to avoid weird circular-reference crash that
// only occurs when running from tests. Very strange.
require("../../../src/util/commandline");

import { loader } from "../../../src/util/commandline/command-loader";
import { finder } from "../../../src/util/commandline/command-finder";

describe("Loading commands", function () {
  it("should return class when the command exists", function () {
    const commandLoader = loader(finder(path.join(__dirname, "sample-commands")));
    const { commandFactory: command } = commandLoader(["cmd1"]);
    expect(command).to.be.a("function")
      .and.property("name", "Command1");
  });

  it("should return null if command doesn't exist", function () {
    const commandLoader = loader(finder(path.join(__dirname, "sample-commands")));
    expect(commandLoader(["no", "such", "command"])).to.be.null;
  });

  it("should call loader to find command to load", function () {
    const commandFinder = finder(path.join(__dirname, "sample-commands"));
    const findSpy = sinon.spy(commandFinder);
    const commandLoader = loader(findSpy);
    commandLoader(["cmd1"]);

    expect(findSpy.calledOnce).to.be.true;
    expect(findSpy.firstCall.args).to.have.lengthOf(1);
    const args = findSpy.firstCall.args[0];
    expect(Array.isArray(args)).to.be.true;
    expect(args[0]).to.equal("cmd1");
  });

  it("should look through subdirs to load", function () {
    const commandLoader = loader(finder(path.join(__dirname, "sample-commands")));
    /* tslint:disable-next-line:no-unused-variable */
    const { commandFactory: command, args: remainingArgs } = commandLoader(["subcommands", "cmd2"]);
    expect(command).to.be.a("function")
      .and.property("name", "Command2");
    expect(remainingArgs).to.deep.equal([]);
  });
});
