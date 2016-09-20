import * as path from "path";

import { expect } from "chai";
import * as sinon from "sinon";

import { Command, CommandResult, runner, succeeded } from "../../../src/util/commandline";

describe("Running commands", function () {
  it("should execute command when it's legal", function() {
    const run = runner(path.join(__dirname, "sample-commands"));
    return run(["cmd1"])
      .then((result: CommandResult) => {
        expect(succeeded(result)).to.be.true;
      });
  });
});
