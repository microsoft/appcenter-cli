import { TestFile, TestManifest, TestFrameworkData } from "../../../../src/commands/tests/lib/test-manifest";
import { PathResolver } from "../../../../src/commands/tests/lib/path-resolver";
import { TestManifestReader } from "../../../../src/commands/tests/lib/test-manifest-reader";
import { expect } from "chai";
import * as path from "path";
import * as _ from "lodash";

describe("TestManifestReader.readManifest", function() {
  let expectedManifest = new TestManifest(
    "1.0.0",
    [
      new TestFile("test/commands/tests/sample-test-workspace/lib/tests.rb", "index.rb", "Ignored"),
      new TestFile("test/commands/tests/sample-test-workspace/resources/messages.csv", "resources/messages.csv", "Ignored"),
      new TestFile("test/commands/tests/sample-test-workspace/resources/pl-PL/messages.csv", "resources/pl-PL/messages.csv", "Ignored"),
      new TestFile("test/commands/tests/sample-test-workspace/resources/ReadMe.txt", "resources/ReadMe.txt", "Ignored"),
    ],
    new TestFrameworkData(
      "uiTest",
      {
        "testFixtures": [
          {
            "name": "MyTestFixture",
            "testMethods": [
              "VerifyFoo",
              "VerifyBar"
            ]
          },
          {
            "name": "AnotherTestFixture",
            "testMethods": [
              "VerifyBuzz"
            ]
          }
        ]
      }
    ));

  function normalizeManifest(manifest: TestManifest) {
    return {
      "schemaVersion": manifest.version,
      "testFramework": manifest.testFramework,
      "files": _.sortBy(manifest.files.map(f => {  
        return { 
          "sourcePath": f.sourcePath.replace(new RegExp("/", 'g'), path.sep),
          "targetRelativePath": f.targetRelativePath.replace(new RegExp("/", 'g'), path.sep), 
        } }), ['sourcePath'])
    }
  }

  it("should correctly read json manifest", async () => {
    let actualManifest = await TestManifestReader.readFromFile("test/commands/tests/sample-test-workspace/test-cloud-manifest.json");
    expect(normalizeManifest(actualManifest)).to.eql(normalizeManifest(expectedManifest)); 
  });
});