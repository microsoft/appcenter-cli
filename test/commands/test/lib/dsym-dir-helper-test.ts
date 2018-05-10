import * as chai from "chai";
import { getDSymFile } from "../../../../src/commands/test/lib/dsym-dir-helper";
import * as fsLayout from "../../../util/fs/fs-layout";
import * as path from "path";
import * as pfs from "../../../../src/util/misc/promisfied-fs";

const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;

describe("getDSymDirectory", () => {
  let testDirPath: string = null;

  afterEach(async () => {
    if (testDirPath) {
      await pfs.rmDir(testDirPath, true);
    }
  });

  it("should fail if dSYM dir doesn't exist", async () => {
    testDirPath = await fsLayout.createLayout({ });
    const dSymPath = path.join(testDirPath, "Symbols.dSYM");

    await expect(getDSymFile(dSymPath)).to.eventually.be.rejected;
  });

  it("should fail if the dSYM directory has no 'dSYM' extension", async () => {
    testDirPath = await fsLayout.createLayout({
      Symbols: {
        Contents: {
          Resources: {
            DWARF: {
              file1: "DSym 1"
            }
          }
        }
      }
    });

    const dSymPath = path.join(testDirPath, "Symbols");
    await expect(getDSymFile(dSymPath)).to.eventually.be.rejected;
  });

  it("should fail if there is no DWARF directory", async () => {
    testDirPath = await fsLayout.createLayout({
      "Symbols.dSYM": {
        Contents: {
          Resources: { }
        }
      }
    });

    const dSymPath = path.join(testDirPath, "Symbols.dSYM");
    await expect(getDSymFile(dSymPath)).to.eventually.be.rejected;
  });

  it("should fail if there is no dSym file in DWARF directory", async () => {
    testDirPath = await fsLayout.createLayout({
      "Symbols.dSYM": {
        Contents: {
          Resources: {
            DWARF: { }
          }
        }
      }
    });

    const dSymPath = path.join(testDirPath, "Symbols.dSYM");
    await expect(getDSymFile(dSymPath)).to.eventually.be.rejected;
  });

  it("should fail if there is more than one dSym file in DWARF directory", async () => {
    testDirPath = await fsLayout.createLayout({
      "Symbols.dSYM": {
        Contents: {
          Resources: {
            DWARF: {
              file1: "DSym 1",
              file2: "DSym 2"
            }
          }
        }
      }
    });

    const dSymPath = path.join(testDirPath, "Symbols.dSYM");
    await expect(getDSymFile(dSymPath)).to.eventually.be.rejected;
  });

  it("should return correct file if there is only one dSym file in DWARF directory", async () => {
    testDirPath = await fsLayout.createLayout({
      "Symbols.dSYM": {
        Contents: {
          Resources: {
            DWARF: {
              file1: "DSym 1"
            }
          }
        }
      }
    });

    const dSymPath = path.join(testDirPath, "Symbols.dSYM");
    const dsymFile = await getDSymFile(dSymPath);
    const expectedPath = path.join(dSymPath, "Contents", "Resources", "DWARF", "file1");

    expect(dsymFile.sourcePath).to.eql(expectedPath);
    expect(dsymFile.targetRelativePath).to.eql("file1");
    expect(dsymFile.fileType).to.eql("dsym-file");
  });
});
