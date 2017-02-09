import * as fs from "fs";
import * as path from "path";
import * as pfs from "../../../util/misc/promisfied-fs";

export class XCUITestPreparer {
  private readonly artifactsDir: string;
  private buildDir: string;
  private readonly testIpaPath: string;

  constructor(artifactsDir: string, testIpaPath: string) {
    if (!artifactsDir) {
      throw new Error("Argument artifactsDir is required");
    }

    this.artifactsDir = artifactsDir;
    this.testIpaPath = testIpaPath;
  }

  public async prepare(): Promise<string> {
    await this.validatePathExists(
      this.testIpaPath,
      true,
      `File not found for test ipa path: "${this.testIpaPath}"`);
    await pfs.cpFile(this.testIpaPath, path.join(this.artifactsDir, path.basename(this.testIpaPath)));

    let manifestPath = path.join(this.artifactsDir, "manifest.json");
    let manifest = await this.createXCUITestManifest();
    let manifestJson = JSON.stringify(manifest, null, 1);
    await pfs.writeFile(manifestPath, manifestJson);

    return manifestPath;
  }

  private async validatePathExists(path: string, isFile: boolean, errorMessage: string): Promise<void> {
    let stats: fs.Stats = null;
    
    try {
      stats = await pfs.stat(path);
    }
    catch (err) {
      throw new Error(errorMessage);
    }

    if (isFile !== stats.isFile()) {
      throw new Error(errorMessage);
    }
  }

  private async createXCUITestManifest(): Promise<any> {
    let ipaArtifactsPath = path.basename(this.testIpaPath); 
    let result = {
      "schemaVersion": "1.0.0",
      "files": [ipaArtifactsPath],
      "testFramework": {
        "name": "xcuitest",
        "data": { }
      }
    };

    return result;
  }
}