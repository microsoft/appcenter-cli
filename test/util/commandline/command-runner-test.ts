import * as path from "path";

import { expect } from "chai";

import { CommandResult, ErrorCodes, runner, failed, succeeded } from "../../../src/util/commandline";

describe("Running commands", function () {
  const run = runner(path.join(__dirname, "sample-commands"));

  it("should execute command when it's legal", function () {
    return run(["cmd1"])
      .then((result: CommandResult) => {
        expect(succeeded(result)).to.be.true;
      });
  });

  it("should fail with not found error if not found", function () {
    return run(["not", "a", "command"])
      .then((result: CommandResult) => {
        expect(failed(result)).to.be.true;
        // We need this if check to get typescript to line up types correctly
        if (failed(result)) {
          expect(result.errorCode).to.equal(ErrorCodes.NoSuchCommand);
        }
      });
  });

  it("should fail if command has invalid characters", function () {
    return run(["..", "command-finder-test"])
      .then((result: CommandResult) => {
        expect(failed(result)).to.be.true;
        if (failed(result)) {
          expect(result.errorCode).to.equal(ErrorCodes.Exception);
        }
      });
  });

  it("should fail with exception result if command throws", function () {
    return run(["alwaysfail"])
      .then((result: CommandResult) => {
        expect(failed(result)).to.be.true;
        if (failed(result)) {
          expect(result.errorCode).to.equal(ErrorCodes.Exception);
          expect(result.errorMessage).to.match(/"Failed on purpose"$/);
        }
      });
  });
});
