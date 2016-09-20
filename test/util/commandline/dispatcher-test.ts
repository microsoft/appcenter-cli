import * as path from "path";
import { expect } from "chai";
import { Dispatcher } from "../../../src/util/commandline/dispatcher";

describe("Dispatching commands", function () {
  let dispatcher: Dispatcher;

  before(function () {
    dispatcher = new Dispatcher(path.join(__dirname, "sample-commands"));
  });

  it("should return null if no such command exists", function () {
    const commandPath: string = dispatcher.findCommand(["no", "such", "command"]);
    expect(commandPath).to.be.null;
  });

  it("should return path to require for existing command", function () {
    const commandPath = dispatcher.findCommand(["cmd1"]);
    expect(commandPath).to.equal(path.join(__dirname, "sample-commands", "cmd1.ts"));
  });

  it("should fail if command includes '.' or '..'", function () {
    expect(() => dispatcher.findCommand(["sample-commands", "..", "disatcher-test"])).to.throw(Error);
  });
});