import { XCUITestPreparer } from "../../../../src/commands/test/lib/xcuitest-preparer";
import * as chai from "chai";

const expect = chai.expect;

describe("Preparing XCUITest workspace", () => {
  it("should fail when 'include' argument exist", async () => {
    const artifactsDir = "artifactsDir";
    const buildDir = "buildDir";

    try {
      new XCUITestPreparer(artifactsDir, buildDir, null, ["/includePath"]).prepare();
    } catch (e) {
      const ex: Error = e;
      expect(ex.message).contain("--include");
    }
  });
});
