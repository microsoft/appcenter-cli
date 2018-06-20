import { IFileDescriptionJson } from "../../../../src/commands/test/lib/test-manifest-reader";
import { expect } from "chai";
import { parseIncludedFiles, filterIncludedFiles } from "../../../../src/commands/test/lib/included-files-parser";
import * as xmlUtil from "../../../../src/commands/test/lib/xml-util";
import * as os from "os";
import * as Sinon from "sinon";

describe("filterIncludedFiles", () => {
  let sandbox: Sinon.SinonSandbox = null;
  const input = ["file1", "file2"];

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
  });
  afterEach(() => {
      sandbox.restore();
  });

  it("should do nothing if null include is sent", async () => {
    const expected: string[] = [];
    const output = await filterIncludedFiles(input, null);

    expect(output).to.deep.equal(expected);
  });

  it("should do nothing if empty include is sent", async () => {
    const expected: string[] = [];
    const output = await filterIncludedFiles(input, []);

    expect(output).to.deep.equal(expected);
  });

  describe("validXmlFile", function () {
    context("when valid", function () {
      it("should add something.dll.config if something.dll doesn't exist in include", async () => {
        const expected = ["something.dll.config"];
        sandbox.stub(xmlUtil, "validXmlFile").callsFake(() => { return true; });
        const output = await filterIncludedFiles(input, ["something.dll.config"]);

        expect(output).to.deep.equal(expected);
      });

      it("should add something.dll.config", async () => {
        const expected = ["something.dll.config"];
        sandbox.stub(xmlUtil, "validXmlFile").callsFake(() => { return true; });
        const output = await filterIncludedFiles(input, ["something.dll.config"]);

        expect(output).to.deep.equal(expected);
      });

      it("should add something.dll and something.dll.config", async () => {
        const expected = ["something.dll", "something.dll.config"];
        sandbox.stub(xmlUtil, "validXmlFile").callsFake(() => { return true; });
        const output = await filterIncludedFiles(input, ["something.dll", "something.dll.config"]);

        expect(output).to.deep.equal(expected);
      });
    });
  });

  describe("validXmlFile", function () {
    context("when invalid", function () {
      it("should add something.dll.config if something.dll doesn't exist in include", async () => {
        const expected = ["something.dll.config"];
        sandbox.stub(xmlUtil, "validXmlFile").callsFake(() => { return false; });
        const output = await filterIncludedFiles(input, ["something.dll.config"]);

        expect(output).to.deep.equal(expected);
      });

      it("should add something.dll but not something.dll.config", async () => {
        const expected = ["something.dll"];
        sandbox.stub(xmlUtil, "validXmlFile").callsFake(() => { return false; });
        const output = await filterIncludedFiles(input, ["something.dll", "something.dll.config"]);

        expect(output).to.deep.equal(expected);
      });
    });
  });

  it("should add file if something.dll exists in include", async () => {
    const expected = ["something.dll"];
    sandbox.stub(xmlUtil, "validXmlFile").callsFake(() => { return true; });
    const output = await filterIncludedFiles(input, ["something.dll"]);

    expect(output).to.deep.equal(expected);
  });
});

describe("parseIncludedFiles", () => {
  const windowsRootDir = "d:\\workspace";
  const unixRootDir = "/home/user/workspace";

  function normalizePath(path: string): string {
    return path.replace(/\\/g, "/");
  }

  function normalizeFileDescriptions(descriptions: IFileDescriptionJson[]): IFileDescriptionJson[] {
    return descriptions.map((d) => {
      return {
        targetPath: normalizePath(d.targetPath),
        sourcePath: normalizePath(d.sourcePath)
      };
    });
  }

  it("should parse pairs with relative target path and valid source path", () => {
    let rawIncludedFiles: string[] = null;
    let expected: any[] = null;
    let rootDir: string = null;

    if (os.platform() === "win32") {
      rawIncludedFiles = [ "data\\foo=d:\\Temp\\Data", "data\\bar=bar" ];

      expected = [
        {
          targetPath: "data/foo",
          sourcePath: "d:/Temp/Data"
        },
        {
          targetPath: "data/bar",
          sourcePath: "d:/workspace/bar"
        }
      ];

      rootDir = windowsRootDir;
    } else {
      rawIncludedFiles = [ "data/foo=/tmp/data", "data/bar=bar" ];

      expected = [
        {
          targetPath: "data/foo",
          sourcePath: "/tmp/data"
        },
        {
          targetPath: "data/bar",
          sourcePath: "/home/user/workspace/bar"
        }
      ];

      rootDir = unixRootDir;
    }

    const parsedIncludedFiles = normalizeFileDescriptions(parseIncludedFiles(rawIncludedFiles, rootDir));
    expect(parsedIncludedFiles).to.deep.equal(expected);
  });

  it("should accept single absolute, deep path under root dir", () => {
    const rawIncludedFiles = [ "/home/user/workspace/somewhere/myAbsoluteData" ];
    const parsedIncludedFiles = normalizeFileDescriptions(parseIncludedFiles(rawIncludedFiles, unixRootDir));

    const expected = [
      {
        targetPath: "somewhere/myAbsoluteData",
        sourcePath: "/home/user/workspace/somewhere/myAbsoluteData"
      }
    ];

    expect(parsedIncludedFiles).to.deep.equal(expected);
  });

  it("should reject pairs with invalid target path", () => {
    expect(() => {
      parseIncludedFiles(["\"|ff=bar"], windowsRootDir);
    }).to.throw();
  });

  it("should reject pairs with invalid source path", () => {
    expect(() => {
      parseIncludedFiles(["targetr=|'\""], windowsRootDir);
    }).to.throw();
  });

  it("should reject pairs with absolute target path", () => {
    expect(() => {
      parseIncludedFiles(["/tmp/target=source"], windowsRootDir);
    }).to.throw();
  });

  it("should accept single relative path or absolute path under root dir", () => {
    const rawIncludedFiles = [ "myRelativeData", "/home/user/workspace/myAbsoluteData" ];
    const parsedIncludedFiles = normalizeFileDescriptions(parseIncludedFiles(rawIncludedFiles, unixRootDir));

    const expected = [
      {
        targetPath: "myRelativeData",
        sourcePath: "/home/user/workspace/myRelativeData"
      },
      {
        targetPath: "myAbsoluteData",
        sourcePath: "/home/user/workspace/myAbsoluteData"
      }
    ];

    expect(parsedIncludedFiles).to.deep.equal(expected);
  });

  it("should reject single absolute dir that is not under root dir", () => {
    expect(() => {
      parseIncludedFiles(["/tmp/source"], unixRootDir);
    }).to.throw();
  });

  it("should reject single absolute dir that is parent of root dir", () => {
    expect(() => {
      parseIncludedFiles(["/home/user"], unixRootDir);
    }).to.throw();
  });

  it("should reject string that is not a path", () => {
    expect(() => {
      parseIncludedFiles(["|a"], windowsRootDir);
    }).to.throw();
  });
});
