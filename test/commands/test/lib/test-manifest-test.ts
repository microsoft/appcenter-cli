import { TestRunFile } from "../../../../src/commands/test/lib/test-manifest";
import { expect } from "chai";

describe("TestFile.create", function () {
  it("should set all properties", async () => {
    const testFile = await TestRunFile.create(
      "./test/commands/test/sample-test-workspace/resources/ReadMe.txt",
      "resources/ReadMe.txt",
      "test-file");

    expect(testFile.sourcePath).to.eql("./test/commands/test/sample-test-workspace/resources/ReadMe.txt");
    expect(testFile.targetRelativePath).to.eql("resources/ReadMe.txt");
    expect(testFile.sha256).to.eq("a4ff4dd93664068abb8508195da31999fa5fe08aa26492c5aaeab82bed405d59");
    expect(testFile.fileType).to.eq("test-file");
  });
});
