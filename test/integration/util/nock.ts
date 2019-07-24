import * as Nock from "nock";
import * as Path from "path";

type TestCode = () => Promise<void>;

export default class NockHelper {
  constructor() {
    Nock.back.fixtures = Path.join(__dirname, "..", "fixtures");
    Nock.back.setMode("record");
  }

  async runTest(outputFile: string, test: TestCode) {
    await Nock.back(
      "org-list-data.json",
      {}).then(async ({ nockDone }) => {
        await test();
        nockDone();
      });
  }

  finishTest() {
    Nock.back.setMode("wild");
    Nock.cleanAll();
  }
}
