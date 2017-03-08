import * as fs from "fs";
import * as iba from "../../../util/misc/ios-bundle-archiver";
import * as path from "path";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as pglob from "../../../util/misc/promisfied-glob";
import { TestCloudError } from "./test-cloud-error";

export class XCUITestPreparer {
  private readonly artifactsDir: string;
  private readonly buildDir: string;
  private testIpaPath: string;

  constructor(artifactsDir: string, buildDir: string, testIpaPath: string) {
    if (!artifactsDir) {
      throw new Error("Argument artifactsDir is required");
    }

    if (!(buildDir || testIpaPath)) {
      throw new Error("Either buildDir or testIpaPath argument is required");
    }

    if (buildDir && testIpaPath) {
      throw new Error("Arguments buildDir and testIpaPath cannot be used together");
    }

    this.artifactsDir = artifactsDir;
    this.buildDir = buildDir;
    this.testIpaPath = testIpaPath;
  }

  public async prepare(): Promise<string> {
    if (!pfs.exists(this.artifactsDir)) {
      await pfs.mkdir(this.artifactsDir);
    }

    if (this.buildDir) {
      await this.generateTestIpa();
    } else {
      await this.validatePathExists(
        this.testIpaPath,
        true,
        `File not found for test ipa path: "${this.testIpaPath}"`);
      await pfs.cpFile(this.testIpaPath, path.join(this.artifactsDir, path.basename(this.testIpaPath)));
    }
  
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

  private async generateTestIpa(): Promise<void> {
    let runnerAppPaths = await pglob.glob(path.join(this.buildDir, "*-Runner.app"));
    if (runnerAppPaths.length == 0) {
      throw new TestCloudError(`Unable to find test runner app within ${this.buildDir}`);
    }
    if (runnerAppPaths.length > 1) {
      throw new TestCloudError(`Multiple test runner apps found within ${this.buildDir}`);
    }
    this.testIpaPath = path.join(this.artifactsDir, `${path.parse(runnerAppPaths[0]).name}.ipa`);
    await iba.archiveAppBundle(runnerAppPaths[0], this.testIpaPath);
  }
}