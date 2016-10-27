import * as fs from "fs";
import * as crypto from "crypto";

export class TestFile {
  readonly sourcePath: string;
  readonly targetRelativePath: string;
  readonly sha256: string;

  static async create(sourcePath: string, targetPath: string): Promise<TestFile> {
    let hash = crypto.createHash('sha256');

    return new Promise<TestFile>((resolve, reject) => {
      fs.readFile(sourcePath, (error, data) => {
        if (error) {
          reject(error);
        }
        else {
          hash.update(data);
          let sha256 = hash.digest('hex');
          let result = new TestFile(sourcePath, targetPath, sha256);
          resolve(result);
        }
      });
    });
  }

  constructor (sourcePath: string, targetRelativePath: string, sha256: string) {
    if (!sourcePath)
      throw new Error("Argument sourcePath is required");
    if (!targetRelativePath)
      throw new Error("Argument targetRelativePath is required");
    if (!sha256)
      throw new Error("Argument sha256 is required");

    this.sourcePath = sourcePath;
    this.targetRelativePath = targetRelativePath;
    this.sha256 = sha256;
  }
}
export class TestFrameworkData {
  readonly name: string;
  readonly data: any;
  
  constructor(name: string, data: any) {
    if (!name)
      throw new Error("Argument name is required");

    this.name = name;
    this.data = data;
  }
};

export class TestManifest {
  readonly version: string;
  readonly files: TestFile[];
  readonly testFramework: TestFrameworkData;

  constructor(version: string, files: TestFile[], testFramework: TestFrameworkData) {
    if (!version)
      throw new Error("Argument version is required");
    if (!files)
      throw new Error("Argument files is required");
    if (!testFramework)
      throw new Error("Argument testFramework is required");
    
    this.version = version;
    this.files = files;
    this.testFramework = testFramework; 
  }
}