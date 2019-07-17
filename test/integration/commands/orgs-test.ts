import * as Sinon from "sinon";
import OrgListCommand from "../../../src/commands/orgs/list";
import { CommandArgs } from "../../../src/util/commandline";
import { expect } from "chai";
import { out } from "../../../src/util/interaction";
import NockHelper from "../util/nock";

// Have to use `require` because of this: https://github.com/chalk/strip-ansi/issues/11
const stripAnsi = require("strip-ansi");

// This is a proof of concept integration test to show how we could build up a set of integration tests
// To create a test like this, you need to write the test - running the test will generate the .json file
// It relies on your person data - so you'll then need to manually obfuscate the output.
// In future, we could look at creating a test account for integration tests as a full suite of these
// tests could be difficult to maintain (you can't just update the json and you're done).
describe("Validating orgs command", () => {

  let stubbedOutput: Sinon.SinonStub;

  beforeEach(() => {
    stubbedOutput = Sinon.stub(out, "table");
  });

  afterEach(() => {
    stubbedOutput.restore();
  });

  it("should list orgs correctly", async () => {
    const nockHelper: NockHelper = new NockHelper();

    await nockHelper.runTest(
      "org-list-data.json",
      async () => {
      const expectedOutTableRows = [
        ["org 1", "org-1"],
        ["org 2", "org-2"],
        ["org 3", "org-3"],
        ["org 4", "org-4"],
        ["org 5", "org-5"]
      ];

      const args: CommandArgs = {
        command: ["orgs", "list"],
        commandPath: "",
        args: ["--token", "fakeToken"]
      };
      const command = new OrgListCommand(args);
      const result = await command.execute();

      const tableRows: string[][] = stubbedOutput.lastCall.args[1];
      expect(tableRows).to.be.an("array");
      const unchalkedRows: string[][] = tableRows.map((row) => row.map((element) => stripAnsi(element)));

      expect(result.succeeded).to.be.true;
      expect(unchalkedRows).to.eql(expectedOutTableRows);
    });

    nockHelper.finishTest();
  });
});
