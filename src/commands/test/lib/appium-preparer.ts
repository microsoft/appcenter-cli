import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import * as pfs from "../../../util/misc/promisfied-fs";

export class AppiumPreparer {
  private readonly artifactsDir: string;
  private buildDir: string;

  constructor(artifactsDir: string, buildDir: string) {
    if (!artifactsDir) {
      throw new Error("Argument --artifacts-dir is required");
    }
    if (!buildDir) {
      throw new Error("Argument --build-dir is required");
    }

    this.artifactsDir = artifactsDir;
    this.buildDir = buildDir;
  }

  public async prepare(): Promise<string> {
    await this.validateBuildDir();
    await pfs.cpDir(this.buildDir, this.artifactsDir);

    const manifestPath = path.join(this.artifactsDir, "manifest.json");
    const manifest = await this.createAppiumManifest();
    const manifestJson = JSON.stringify(manifest, null, 1);
    await pfs.writeFile(manifestPath, manifestJson);

    return manifestPath;
  }

  private async validateBuildDir() {
    await this.validateBuildDirExists();
    await this.validatePomFile();
    await this.validateDependencyJarsDirectory();
    await this.validateTestClassesDirectory();
  }

  private async validateBuildDirExists() {
    await this.validatePathExists(
      this.buildDir,
      false,
      `Appium build directory "${this.buildDir}" doesn't exist`);
  }

  private validatePomFile(): Promise<void> {
    return this.validatePathExists(
      path.join(this.buildDir, "pom.xml"),
      true,
      `Appium build directory "${this.buildDir}" must contain file "pom.xml"`);
  }

  private validateDependencyJarsDirectory(): Promise<void> {
    return this.validatePathExists(
      path.join(this.buildDir, "dependency-jars"),
      false,
      `Appium build directory "${this.buildDir}" must contain directory "dependency-jars"`);
  }

  private async validateTestClassesDirectory(): Promise<void> {
    const testClassesDir = path.join(this.buildDir, "test-classes");
    await this.validatePathExists(
      path.join(this.buildDir, "test-classes"),
      false,
      `Appium build directory "${this.buildDir}" must contain directory "test-classes"`);

    if (! (await this.hasClassFile(testClassesDir))) {
      throw new Error(`The "test-classes" directory inside Appium build directory "${this.buildDir}" must contain at least one "*.class" file`);
    }
  }

  private async hasClassFile(rootPath: string): Promise<boolean> {
    const entries = await pfs.readdir(rootPath);
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const fullEntryPath = path.join(rootPath, entry);
      const stats = await pfs.stat(fullEntryPath);
      if (stats.isFile() && entry.endsWith(".class")) {
        return true;
      }

      if (stats.isDirectory() && this.hasClassFile(fullEntryPath)) {
        return true;
      }
    }

    return false;
  }

  private async validatePathExists(path: string, isFile: boolean, errorMessage: string): Promise<void> {
    let stats: fs.Stats = null;

    try {
      stats = await pfs.stat(path);
    } catch (err) {
      throw new Error(errorMessage);
    }

    if (isFile !== stats.isFile()) {
      throw new Error(errorMessage);
    }
  }

  private async createAppiumManifest(): Promise<any> {
    const result = {
      schemaVersion: "1.0.0",
      files: [ "pom.xml", "dependency-jars", "test-classes" ],
      testFramework: {
        name: "appium",
        data: { }
      }
    };

    return result;
  }
}
