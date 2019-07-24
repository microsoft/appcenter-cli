import * as Sinon from "sinon";
import HelpCommand from "../../../src/commands/help";
import { CommandArgs } from "../../../src/util/commandline";
import { expect } from "chai";

describe("Validating help command", () => {

  let stubbedConsole: Sinon.SinonStub;

  beforeEach(() => {
    stubbedConsole = Sinon.stub(console, "log");
  });

  afterEach(() => {
    stubbedConsole.restore();
  });

  it("should output correct information", async () => {
    const args: CommandArgs = {
      command: ["help"],
      commandPath: "",
      args: []
    };
    const command = new HelpCommand(args);
    const result = await command.execute();

    expect(result.succeeded).to.be.true;
    expect(stubbedConsole.getCall(1).args[0]).to.contain("Visual Studio App Center helps you build, test, distribute, and monitor mobile apps.");
  });
});
