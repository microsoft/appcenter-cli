import { IFileDescriptionJson } from "../../../../src/commands/test/lib/test-manifest-reader";
import { expect } from "chai";
import { parseIncludedFiles } from "../../../../src/commands/test/lib/included-files-parser";
import * as os from "os";

describe("parseIncludedFiles", () => {
  let windowsRootDir = "d:\\workspace";
  let unixRootDir = "/home/user/workspace";

  function normalizePath(path: string): string {
    return path.replace(/\\/g, "/");
  }

  function normalizeFileDescriptions(descriptions: IFileDescriptionJson[]): IFileDescriptionJson[] {
    return descriptions.map(d => {
      return {
        "targetPath": normalizePath(d.targetPath),
        "sourcePath": normalizePath(d.sourcePath)
      };
    })
  }

  it("should parse pairs with relative target path and valid source path", () => {
    let rawIncludedFiles: string[] = null;
    let expected: any[] = null;
    let rootDir: string = null;

    if (os.platform() === "win32") {
      rawIncludedFiles = [ "data\\foo=d:\\Temp\\Data", "data\\bar=bar" ];

      expected = [
        {
          "targetPath": "data/foo",
          "sourcePath": "d:/Temp/Data"
        },
        {
          "targetPath": "data/bar",
          "sourcePath": "d:/workspace/bar"
        }
      ];

      rootDir = windowsRootDir;
    }
    else {
      rawIncludedFiles = [ "data/foo=/tmp/data", "data/bar=bar" ];

      expected = [
        {
          "targetPath": "data/foo",
          "sourcePath": "/tmp/data"
        },
        {
          "targetPath": "data/bar",
          "sourcePath": "/home/user/workspace/bar"
        }
      ];

      rootDir = unixRootDir;
    }

    let parsedIncludedFiles = normalizeFileDescriptions(parseIncludedFiles(rawIncludedFiles, rootDir));
    expect(parsedIncludedFiles).to.deep.equal(expected);
  });

  it("should accept single absolute, deep path under root dir", () => {
    let rawIncludedFiles = [ "/home/user/workspace/somewhere/myAbsoluteData" ];
    let parsedIncludedFiles = normalizeFileDescriptions(parseIncludedFiles(rawIncludedFiles, unixRootDir));

    let expected = [
      {
        "targetPath": "somewhere/myAbsoluteData",
        "sourcePath": "/home/user/workspace/somewhere/myAbsoluteData"
      }
    ];

    expect(parsedIncludedFiles).to.deep.equal(expected);
  });


  it("should reject pairs with invalid target path", () => {
    expect(() => {
      parseIncludedFiles(["\"|ff=bar"], windowsRootDir)
    }).to.throw();
  });

  it("should reject pairs with invalid source path", () => {
    expect(() => {
      parseIncludedFiles(["targetr=|'\""], windowsRootDir)
    }).to.throw();
  });

  it("should reject pairs with absolute target path", () => {
    expect(() => {
      parseIncludedFiles(["/tmp/target=source"], windowsRootDir)
    }).to.throw();
  });

  it("should accept single relative path or absolute path under root dir", () => {
    let rawIncludedFiles = [ "myRelativeData", "/home/user/workspace/myAbsoluteData" ];
    let parsedIncludedFiles = normalizeFileDescriptions(parseIncludedFiles(rawIncludedFiles, unixRootDir));

    let expected = [
      {
        "targetPath": "myRelativeData",
        "sourcePath": "/home/user/workspace/myRelativeData"
      },
      {
        "targetPath": "myAbsoluteData",
        "sourcePath": "/home/user/workspace/myAbsoluteData"
      }
    ];

    expect(parsedIncludedFiles).to.deep.equal(expected);
  });

  it("should reject single absolute dir that is not under root dir", () => {
    expect(() => {
      parseIncludedFiles(["/tmp/source"], unixRootDir)
    }).to.throw();
  });

  it("should reject single absolute dir that is parent of root dir", () => {
    expect(() => {
      parseIncludedFiles(["/home/user"], unixRootDir)
    }).to.throw();
  });

  it("should reject string that is not a path", () => {
    expect(() => {
      parseIncludedFiles(["|a"], windowsRootDir)
    }).to.throw();
  });
});