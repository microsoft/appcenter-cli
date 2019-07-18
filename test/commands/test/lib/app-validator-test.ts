import { AppValidator } from "../../../../src/commands/test/lib/app-validator";
import { expect } from "chai";
import * as path from "path";
import * as temp from "temp";
import * as JsZip from "jszip";
import * as JsZipHelper from "../../../../src/util/misc/jszip-helper";

function createFakeAppFile(appFilePath: string, entryNames: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    temp.mkdir("app-validator-tests", (error, dirPath) => {
      try {
        if (error) {
          reject(error);
          return;
        }

        const inputFile = path.join(dirPath, appFilePath);
        const zip = new JsZip();
        for (const entryName of entryNames) {
          zip.file(entryName, Buffer.from("Fake file"));
        }

        JsZipHelper.writeZipToPath(inputFile, zip, "STORE").then(() => resolve(inputFile), (writingError) => reject(writingError));
      } catch (err) {
        reject(err);
      }
    });
  });
}

describe("Validating application file", () => {
  it("should accept iOS application", async () => {
    const appPath = await createFakeAppFile("myApp.ipa", []);
    await AppValidator.validate(appPath);
  });

  it("should accept Android apps", async () => {
    const appPath = await createFakeAppFile("myApp.apk", []);
    await AppValidator.validate(appPath);
  });

  it("should reject non-Android and non-iOS applications", async () => {
    const appPath = await createFakeAppFile("myApp.foo", []);
    let errorCaught = false;
    try {
      await AppValidator.validate(appPath);
    } catch (error) {
      errorCaught = true;
    }

    expect(errorCaught).to.equal(true);
  });
});
