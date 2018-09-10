import { getLastFolderInPath } from "../../../../src/commands/codepush/lib/file-utils";
import { expect } from "chai";
import { createTempPathWithFakeLastFolder, createFile } from "../utils";

describe("file-utils test", () => {

  const releaseFileName = "releaseBinaryFile";
  const releaseFileContent = "Hello World!";
  let testPath: string;
  describe("`getLastFolderInPath` method", () => {
    beforeEach(() => {
      testPath = createTempPathWithFakeLastFolder("releaseTest", "lastFolder");
    });

    it("test for nonexistent path", () => {
      // Arrange
      const nonexistentPath = "nonexistent/path";

      // Act
      const throwErrorMethod = function () { getLastFolderInPath(nonexistentPath); };

      // Assert
      expect(throwErrorMethod)
        .to.throw("ENOENT: no such file or directory");
    });

    it("test for folder", () => {
      // Act
      const result = getLastFolderInPath(testPath);

      // Assert
      expect(result).to.be.an("string", "Should be string");
      expect(result).to.be.eql("lastFolder", "Should be `lastFolder`");
    });

    it("test for file", () => {
      // Arrange
      const testFile = createFile(testPath, releaseFileName, releaseFileContent);

      // Act
      const result = getLastFolderInPath(testFile);

      // Assert
      expect(result).to.be.an("string", "Should be string");
      expect(result).to.be.eql("lastFolder", "Should be `lastFolder`");
    });
  });
});
