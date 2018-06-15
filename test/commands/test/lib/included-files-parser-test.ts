import { IFileDescriptionJson } from "../../../../src/commands/test/lib/test-manifest-reader";
import { expect } from "chai";
import { copyIncludedFiles, parseIncludedFiles } from "../../../../src/commands/test/lib/included-files-parser";
import * as xmlUtil from "../../../../src/commands/test/lib/xml-util";
import * as pfs from "../../../../src/util/misc/promisfied-fs";
import * as os from "os";
import * as Sinon from "sinon";

describe("copyIncludedFiles", () => {
  let sandbox: Sinon.SinonSandbox = null;

  beforeEach(() => {
    sandbox = Sinon.sandbox.create();
  });
  afterEach(() => {
      sandbox.restore();
  });

  it("should do nothing if null include is sent", async () => {
    const inputManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
    files: ["file1", "file2"], testFramework: { name: "", data: "" } };
    const expectedManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
      files: ["file1", "file2"], testFramework: { name: "", data: "" } };

    await copyIncludedFiles(inputManifest, null, null);

    expect(inputManifest).to.deep.equal(expectedManifest);
  });

  it("should do nothing if empty include is sent", async () => {
    const inputManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
    files: ["file1", "file2"], testFramework: { name: "", data: "" } };
    const expectedManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
      files: ["file1", "file2"], testFramework: { name: "", data: "" } };

    await copyIncludedFiles(inputManifest, [], null);

    expect(inputManifest).to.deep.equal(expectedManifest);
  });

  it("should do nothing if something.dll.config exists in include", async () => {
    const inputManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
    files: ["file1", "file2"], testFramework: { name: "", data: "" } };
    const expectedManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
      files: ["file1", "file2"], testFramework: { name: "", data: "" } };

    sandbox.stub(xmlUtil, "validateXmlFile").callsFake(() => { return false; });

    await copyIncludedFiles(inputManifest, ["something.dll.config"], "/path/to/files/");

    expect(inputManifest).to.deep.equal(expectedManifest);
  });

  it("should add file if something.dll exists in include", async () => {
    const inputManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
    files: ["file1", "file2"], testFramework: { name: "", data: "" } };
    const expectedManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
      files: ["file1", "file2", "something.dll"], testFramework: { name: "", data: "" } };

    sandbox.stub(xmlUtil, "validateXmlFile").callsFake(() => { return true; });
    sandbox.stub(pfs, "cp").returns(null);

    await copyIncludedFiles(inputManifest, ["something.dll"], "/path/to/files/");

    expect(inputManifest).to.deep.equal(expectedManifest);
  });

  it("should add something.dll.config if it is valid xml", async () => {
    const inputManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
    files: ["file1", "file2"], testFramework: { name: "", data: "" } };
    const expectedManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
      files: ["file1", "file2", "something.dll.config"], testFramework: { name: "", data: "" } };

    sandbox.stub(xmlUtil, "validateXmlFile").callsFake(() => { return true; });
    sandbox.stub(pfs, "cp").returns(null);

    await copyIncludedFiles(inputManifest, ["something.dll.config"], "/path/to/files/");

    expect(inputManifest).to.deep.equal(expectedManifest);
  });

  it("should add something.dll but not something.dll.config if it is not valid xml", async () => {
    const inputManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
    files: ["file1", "file2"], testFramework: { name: "", data: "" } };
    const expectedManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
      files: ["file1", "file2", "something.dll"], testFramework: { name: "", data: "" } };

    sandbox.stub(xmlUtil, "validateXmlFile").callsFake(() => { return false; });
    sandbox.stub(pfs, "cp").returns(null);

    await copyIncludedFiles(inputManifest, ["something.dll", "something.dll.config"], "/path/to/files/");

    expect(inputManifest).to.deep.equal(expectedManifest);
  });

  it("should add something.dll and something.dll.config if it is valid xml", async () => {
    const inputManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
    files: ["file1", "file2"], testFramework: { name: "", data: "" } };
    const expectedManifest = { schemaVersion: "1.0.0", cliVersion: "1.0.0",  applicationFile: "",
      files: ["file1", "file2", "something.dll", "something.dll.config"], testFramework: { name: "", data: "" } };

    sandbox.stub(xmlUtil, "validateXmlFile").callsFake(() => { return true; });
    sandbox.stub(pfs, "cp").returns(null);

    await copyIncludedFiles(inputManifest, ["something.dll", "something.dll.config"], "/path/to/files/");

    expect(inputManifest).to.deep.equal(expectedManifest);
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
