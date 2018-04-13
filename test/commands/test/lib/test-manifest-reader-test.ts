import { TestRunFile, TestManifest, TestFrameworkData } from "../../../../src/commands/test/lib/test-manifest";
import { TestManifestReader } from "../../../../src/commands/test/lib/test-manifest-reader";
import { expect } from "chai";
import * as path from "path";
import * as _ from "lodash";

describe("TestManifestReader.readManifest", () => {
  const expectedManifest = new TestManifest(
    "1.0.0",
    "1.0.14",
    new TestRunFile(
        "test/commands/test/sample-test-workspace/apps/app.txt",
        "app.txt",
        "Ignores",
        "app-file"),
    [
      new TestRunFile(
        "test/commands/test/sample-test-workspace/lib/tests.rb",
        "index.rb",
        "Ignored",
        "test-file"),
      new TestRunFile(
        "test/commands/test/sample-test-workspace/resources/messages.csv",
        "resources/messages.csv",
        "Ignored",
        "test-file"),
      new TestRunFile(
        "test/commands/test/sample-test-workspace/resources/pl-PL/messages.csv",
        "resources/pl-PL/messages.csv",
        "Ignored",
        "test-file"),
      new TestRunFile(
        "test/commands/test/sample-test-workspace/resources/ReadMe.txt",
        "resources/ReadMe.txt",
        "Ignored",
        "test-file"),
    ],
    new TestFrameworkData(
      "uiTest",
      {
        testFixtures: [
          {
            name: "MyTestFixture",
            testMethods: [
              "VerifyFoo",
              "VerifyBar"
            ]
          },
          {
            name: "AnotherTestFixture",
            testMethods: [
              "VerifyBuzz"
            ]
          }
        ]
      }
    ));

  function normalizeManifest(manifest: TestManifest) {
    return {
      schemaVersion: manifest.version,
      cliVersion: manifest.cliVersion,
      testFramework: manifest.testFramework,
      applicationFile: normalizeFile(manifest.applicationFile),
      files: _.sortBy(manifest.testFiles.map(normalizeFile), ["sourcePath"])
    };
  }

  function normalizeFile(file: TestRunFile) {
    return {
      sourcePath: normalizePath(file.sourcePath),
      targetRelativePath: normalizePath(file.targetRelativePath)
    };
  }

  function normalizePath(filePath: string): string {
    return filePath.replace(new RegExp("/", "g"), path.sep);
  }

  it("should correctly read json manifest", async () => {
    const actualManifest = await TestManifestReader.readFromFile("test/commands/test/sample-test-workspace/test-cloud-manifest.json");
    expect(normalizeManifest(actualManifest)).to.eql(normalizeManifest(expectedManifest));
  });
});
