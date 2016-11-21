import { getDSymFile } from "../../../../src/commands/test/lib/dsym-dir-helper"; 
import { expect } from "chai";
import * as fsLayout from "../../../util/fs/fs-layout";
import * as path from "path";
import * as pfs from "../../../../src/util/misc/promisfied-fs"; 

async function expectToThrow(func: () => Promise<any>): Promise<void> {
  let caughtException = false;
  try {
    await func();
  }
  catch (err) {
    caughtException = true;
  }

  expect(caughtException).to.be.true;
}

describe("getDSymDirectory", () => {
  let testDirPath: string = null; 
  
  afterEach(async () => {
    if (testDirPath) {
      await pfs.rmDir(testDirPath, true);
    }
  });

  it("should fail if dSYM dir doesn't exist", async () => {
    testDirPath = await fsLayout.createLayout({ });
    let dSymPath = path.join(testDirPath, "Symbols.dSYM");
    
    await expectToThrow(() => getDSymFile(dSymPath));
  });

  it("should fail if the dSYM directory has no 'dSYM' extension", async () => {
    testDirPath = await fsLayout.createLayout({
      "Symbols": { 
        "Contents": { 
          "Resources": { 
            "DWARF": { 
              "file1": "DSym 1"
            }
          }
        }
      }
    });

    let dSymPath = path.join(testDirPath, "Symbols");
    await expectToThrow(() => getDSymFile(dSymPath));
  });

  it("should fail if there is no DWARF directory", async () => {
    testDirPath = await fsLayout.createLayout({ 
      "Symbols.dSYM": {
        "Contents": { 
          "Resources": { }
        }
      }
    });
    
    let dSymPath = path.join(testDirPath, "Symbols.dSYM");
    await expectToThrow(() => getDSymFile(dSymPath));
  });

  it("should fail if there is no dSym file in DWARF directory", async () => {
    testDirPath = await fsLayout.createLayout({
      "Symbols.dSYM": {
        "Contents": { 
          "Resources": { 
            "DWARF": { }
          }
        }
      }
    });

    let dSymPath = path.join(testDirPath, "Symbols.dSYM");
    await expectToThrow(() => getDSymFile(dSymPath));
  });

  it("should fail if there is more than one dSym file in DWARF directory", async () => {
    testDirPath = await fsLayout.createLayout({
      "Symbols.dSYM": {
        "Contents": { 
          "Resources": { 
            "DWARF": { 
              "file1": "DSym 1",
              "file2": "DSym 2"
            }
          }
        }
      }
    });
    
    let dSymPath = path.join(testDirPath, "Symbols.dSYM");
    await expectToThrow(() => getDSymFile(dSymPath));
  });

  it("should return correct file if there is only one dSym file in DWARF directory", async () => {
    testDirPath = await fsLayout.createLayout({
      "Symbols.dSYM": { 
        "Contents": { 
          "Resources": { 
            "DWARF": { 
              "file1": "DSym 1"
            }
          }
        }
      }
    });

    let dSymPath = path.join(testDirPath, "Symbols.dSYM");
    let dsymFile = await getDSymFile(dSymPath);
    let expectedPath = path.join(dSymPath, "Contents", "Resources", "DWARF", "file1");
    
    expect(dsymFile.sourcePath).to.eql(expectedPath);
    expect(dsymFile.targetRelativePath).to.eql("file1");
    expect(dsymFile.fileType).to.eql("dsym-file");
  });
});