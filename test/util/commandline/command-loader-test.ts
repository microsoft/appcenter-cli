import * as path from "path";

import { expect } from "chai";
import * as Sinon from "sinon";

import { Command } from "../../../src/util/commandline/command";
import { CommandLoader } from "../../../src/util/commandline/command-loader";
import { CommandFinder } from "../../../src/util/commandline/command-finder";

describe("Loading commands", function () {
  it("should return class when the command exists", function () {
    let loader = new CommandLoader(new CommandFinder(path.join(__dirname, "sample-commands")));
    let command = loader.load(["cmd1"]);
    expect(command).to.be.a("function")
      .and.property("name", "Command1");
  });

  it("should return null if command doesn't exist", function () {
    let loader = new CommandLoader(new CommandFinder(path.join(__dirname, "sample-commands")));
    expect(loader.load(["no", "such", "command"])).to.be.null;
  });

  it("should call loader to find command to load", function () {
    let finder = new CommandFinder(path.join(__dirname, "sample-commands"));
    let findSpy = Sinon.spy(finder, "find");
    let loader = new CommandLoader(finder);
    loader.load(["cmd1"]);

    console.log(`FindSpy called ${findSpy.callCount} times`);
    expect(findSpy.calledOnce).to.be.true;
    expect(findSpy.firstCall.args).to.have.lengthOf(1);
    let args = findSpy.firstCall.args[0];
    expect(Array.isArray(args)).to.be.true;
    expect(args[0]).to.equal("cmd1");
  });
});
