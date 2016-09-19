import * as path from "path";
import { expect } from "chai";
import { Dispatcher } from "../../../src/util/commandline/dispatcher";

describe("dispatching commands", function () {
  let dispatcher: Dispatcher;

  before(function () {
    dispatcher = new Dispatcher(path.join(__dirname, "sample-commands"));
  });

  it("should return null if no such command exists", function () {
    const commandPath: string = dispatcher.findCommand(["no", "such", "command"]);
    expect(commandPath).to.be.null;
  });

});