import * as fs from "../../../../src/util/misc/promisfied-fs";
import * as path from "path";
import * as temp from "temp";

import { buildGradleCases } from "./cases";
import collectBuildGradleInfo from "../../../../src/commands/lib/android/collect-build-gradle-info";
import { expect } from "chai";

describe("Collect build.gradle info", function () {

  buildGradleCases.forEach((example, index) => {
    it(example.name, async () => {
      // Arrange
      const filePath = await createTempFile("build.gradle-" + index, example.content);

      // Act
      const actualResult = await collectBuildGradleInfo(filePath);
      actualResult.path = null;
      actualResult.contents = null;

      // Assert
      expect(actualResult).to.deep.equal(example.expectedResult);
    });
  });
});

async function createTempFile(fileName: string, fileContent: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    temp.mkdir("init-android-tests", (error, dirPath) => {
      try {
        if (error) {
          reject(error);
          return;
        }

        const filePath = path.join(dirPath, fileName);
        fs.writeFile(filePath, fileContent)
          .then(() => resolve(filePath))
          .catch(err => reject(err));
      }
      catch (err) {
        reject(err);
      }
    });
  });
}