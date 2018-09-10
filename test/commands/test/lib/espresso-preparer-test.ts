import { EspressoPreparer } from "../../../../src/commands/test/lib/espresso-preparer";
import * as chai from "chai";

const expect = chai.expect;

describe("Preparing Espresso workspace", () => {
  it("should fail when 'include' argument exist", async () => {
    const artifactsDir = "artifactsDir";
    const buildDir = "buildDir";

    try {
      new EspressoPreparer(artifactsDir, buildDir, null, ["/includePath"]).prepare();
    } catch (e) {
      const ex: Error = e;
      expect(ex.message).contain("--include");
    }
  });
});
