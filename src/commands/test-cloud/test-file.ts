import * as fs from "fs";
import * as crypto from "crypto";

const hash = crypto.createHash('sha256');

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
    this.sourcePath = sourcePath;
    this.targetRelativePath = targetRelativePath;
    this.sha256 = sha256;
  }
}