import { TestFile } from "../../../src/commands/test-cloud/test-file";
import { expect } from "chai";
const path = require('path');

describe("TestFile.create", function() {
  it("should set all properties", async () => {
    let testFile = await TestFile.create("./test/commands/test-cloud/sample-test-workspace/resources/ReadMe.txt", "resources/ReadMe.txt");
    expect(testFile.sourcePath).to.eql("./test/commands/test-cloud/sample-test-workspace/resources/ReadMe.txt");
    expect(testFile.targetRelativePath).to.eql("resources/ReadMe.txt");
    expect(testFile.sha256).to.eq("a4ff4dd93664068abb8508195da31999fa5fe08aa26492c5aaeab82bed405d59");
  });
});