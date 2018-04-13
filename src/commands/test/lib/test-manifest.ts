import * as fs from "fs";
import * as crypto from "crypto";

export type TestRunFileType = "app-file" | "dsym-file" | "test-file";

export class TestRunFile {
  readonly sourcePath: string;
  readonly targetRelativePath: string;
  readonly sha256: string;
  readonly fileType: TestRunFileType;

  static async create(sourcePath: string, targetRelativePath: string, fileType: TestRunFileType): Promise<TestRunFile> {
    const hash = crypto.createHash("sha256");

    return new Promise<TestRunFile>((resolve, reject) => {
      fs.readFile(sourcePath, (error, data) => {
        if (error) {
          reject(error);
        } else {
          hash.update(data);
          const sha256 = hash.digest("hex");
          const result = new TestRunFile(sourcePath, targetRelativePath, sha256, fileType);
          resolve(result);
        }
      });
    });
  }

  constructor (sourcePath: string, targetRelativePath: string, sha256: string, fileType: TestRunFileType) {
    if (!sourcePath) {
      throw new Error("Argument sourcePath is required");
    }
    if (!targetRelativePath) {
      throw new Error("Argument targetRelativePath is required");
    }
    if (!sha256) {
      throw new Error("Argument sha256 is required");
    }

    this.sourcePath = sourcePath;
    this.targetRelativePath = targetRelativePath.replace(new RegExp(/\\/, "g"), "/");
    this.sha256 = sha256;
    this.fileType = fileType;
  }
}
export class TestFrameworkData {
  readonly name: string;
  readonly data: any;

  constructor(name: string, data: any) {
    if (!name) {
      throw new Error("Argument name is required");
    }

    this.name = name;
    this.data = data;
  }
}

export class TestManifest {
  readonly version: string;
  readonly cliVersion: string;
  readonly testFiles: TestRunFile[];
  readonly applicationFile?: TestRunFile;
  readonly testFramework: TestFrameworkData;

  constructor(version: string, cliVersion: string, applicationFile: TestRunFile, files: TestRunFile[], testFramework: TestFrameworkData) {
    if (!version) {
      throw new Error("Argument version is required");
    }
    if (!files) {
      throw new Error("Argument files is required");
    }
    if (!testFramework) {
      throw new Error("Argument testFramework is required");
    }

    this.version = version;
    this.cliVersion = cliVersion;
    this.applicationFile = applicationFile;
    this.testFiles = files;
    this.testFramework = testFramework;
  }
}
