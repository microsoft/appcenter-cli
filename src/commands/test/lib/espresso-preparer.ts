import * as _ from "lodash";
import * as path from "path";
import * as pglob from "../../../util/misc/promisfied-glob";
import * as pfs from "../../../util/misc/promisfied-fs";

export class EspressoPreparer {
  private readonly artifactsDir: string;
  private readonly buildDir: string;
  private readonly testApkPath: string;

  constructor(artifactsDir: string, buildDir: string, testApkPath?: string, include?: string[]) {
    if (!artifactsDir) {
      throw new Error("Argument --artifacts-dir is required");
    }

    if (include && include.length) {
      throw new Error("Argument --include cannot be used for Espresso");
    }

    this.buildDir = buildDir;
    this.artifactsDir = artifactsDir;
    this.testApkPath = testApkPath;
  }

  private validateEitherBuildDirOrTestApkPath() {
    if (this.buildDir && this.testApkPath) {
      throw new Error("You must not specify both build dir and test apk path.");
    }
    if (!(this.buildDir || this.testApkPath)) {
      throw new Error("Either --artifacts-dir, --build-dir or --test-apk-path must be specified");
    }
  }

  public async prepare(): Promise<string> {
    this.validateEitherBuildDirOrTestApkPath();
    if (this.testApkPath) {
      if (!await pfs.fileExists(this.testApkPath)) {
        throw new Error(`File not found for test apk path: "${this.testApkPath}"`);
      }
      await pfs.cpFile(this.testApkPath, path.join(this.artifactsDir, path.basename(this.testApkPath)));
    } else {
      await this.validateBuildDir();
      await pfs.cpDir(this.buildDir, this.artifactsDir);
    }
    const manifestPath = path.join(this.artifactsDir, "manifest.json");
    const manifest = await this.createEspressoManifest();
    const manifestJson = JSON.stringify(manifest, null, 1);
    await pfs.writeFile(manifestPath, manifestJson);

    return manifestPath;
  }

  private async validateBuildDir() {
    await this.validateBuildDirExists();
    await this.validateTestApkExists();
  }

  private async validateBuildDirExists() {
    if (!await pfs.directoryExists(this.buildDir)) {
      throw new Error(`Espresso build directory "${this.buildDir}" doesn't exist`);
    }
  }

  private async validateTestApkExists(): Promise<void> {
    await this.detectTestApkPathFromBuildDir();
  }

  private async detectTestApkPathFromBuildDir(): Promise<string> {
    const apkPattern = path.join(this.buildDir, "*androidTest.apk");
    const files = await pglob.glob(apkPattern);

    if (files.length === 0) {
       throw new Error(`An apk with name matching "*androidTest.apk" was not found inside directory inside build directory "${this.buildDir}"`);
    } else if (files.length >= 2) {
       throw new Error(`Multiple apks with name matching "*androidTest.apk" were found inside build directory "${this.buildDir}". A unique match is required.`);
    } else {
      const apkPath = files[files.length - 1];
      return apkPath;
    }
  }

  private async createEspressoManifest(): Promise<any> {
    const apkFullPath = this.testApkPath ? this.testApkPath : await this.detectTestApkPathFromBuildDir();
    const apkArtifactsPath = path.basename(apkFullPath);
    const result = {
      schemaVersion: "1.0.0",
      files: [apkArtifactsPath],
      testFramework: {
        name: "espresso",
        data: { }
      }
    };

    return result;
  }
}
