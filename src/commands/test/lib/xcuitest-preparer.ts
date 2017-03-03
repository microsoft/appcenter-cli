import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as pglob from "../../../util/misc/promisfied-glob";
import * as process from "../../../util/misc/process-helper";
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
    if (this.buildDir) {
      this.testIpaPath = await this.generateTestIpa();
    }

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

  private async generateTestIpa(): Promise<string> {
    let runnerAppPaths = await pglob.glob(path.join(this.buildDir, "*-Runner.app"));
    if (runnerAppPaths.length == 0) {
      throw new TestCloudError(`Unable to find test runner app within ${this.buildDir}`);
    }
    if (runnerAppPaths.length > 1) {
      throw new TestCloudError(`Multiple test runner apps found within ${this.buildDir}`);
    }
    return this.archiveAppBundle(runnerAppPaths[0]);
  }

  private async archiveAppBundle(appPath: string): Promise<string> {
    if (!(os.platform() === "darwin")) {
      throw Error("iOS applications can only be archived on OS-X");
    }
    let appPathObject = path.parse(appPath)

    let tempPath = await pfs.mkTempDir("xcuitest-ipa");
    let payloadPath = path.join(tempPath, "Payload");
    await pfs.mkdir(payloadPath);
    let tempAppPath = path.join(payloadPath, appPathObject.base);

    let exitCode = await process.execAndWait(`ditto ${appPath} ${tempAppPath}`);
    if (exitCode !== 0) {
      await pfs.rmDir(tempPath, true);
      throw new TestCloudError("Cannot archive app bundle. Please inspect logs for more details", exitCode);
    }
    
    let ipaPath = path.join(appPathObject.dir, `${appPathObject.name}.ipa`);
    exitCode = await process.execAndWait(`ditto -ck --sequesterRsrc ${tempPath} ${ipaPath}`);
    if (exitCode !== 0) {
      await pfs.rmDir(tempPath, true);
      throw new TestCloudError("Cannot archive app bundle. Please inspect logs for more details", exitCode);
    }

    await pfs.rmDir(tempPath, true);
    return ipaPath;    
  }
}