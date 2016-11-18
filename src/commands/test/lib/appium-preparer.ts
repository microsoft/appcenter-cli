import { IFileDescriptionJson } from "./test-manifest-reader";
import { out } from "../../../util/interaction";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import * as pfs from "../../../util/misc/promisfied-fs";

export class AppiumPreparer {
  private readonly artifactsDir: string;
  private buildDir: string;
  private projectDir: string;
  public include: IFileDescriptionJson[];
  public testParameters: { [key:string]: any };

  constructor(artifactsDir: string, projectDir?: string, buildDir?: string) {
    if (!artifactsDir) {
      throw new Error("Argument artifactsDir is required");
    }

    this.projectDir = projectDir;
    this.buildDir = buildDir;
    this.artifactsDir = artifactsDir;

    this.validateEitherProjectOrBuildDir();
  }

  private validateEitherProjectOrBuildDir() {
    if ((this.projectDir && this.buildDir) || !(this.projectDir || this.buildDir)) {
      throw new Error("Either projectDir or buildDir must be specified");
    }
  }

  public async prepare(): Promise<string> {
    if (this.projectDir) {
      await this.validateProjectDir();
      this.buildDir = await this.generateBuildDirFromProject();
    }

    this.validateBuildDir();

    await pfs.cpDir(this.buildDir, this.artifactsDir);

    let manifestPath = path.join(this.artifactsDir, "test-manifest.json");
    let manifest = await this.createAppiumManifest();
    let manifestJson = JSON.stringify(manifest, null, 1);
    await pfs.writeFile(manifestPath, manifestJson);

    return manifestPath;
  }

  private async validateProjectDir() {
    await this.validatePathExists(
      this.projectDir, 
      false, 
      `Project directory ${this.projectDir} doesn't exist`);
  }

  private async generateBuildDirFromProject(): Promise<string> {
    throw new Error("Not implemented");
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
    let testClassesDir = path.join(this.buildDir, "test-classes");
    await this.validatePathExists(
      path.join(this.buildDir, "test-classes"),
      false,
      `Appium build directory "${this.buildDir}" must contain directory "test-classes"`);

    if (! (await this.hasClassFile(testClassesDir))) {
      throw new Error(`The "test-classes" directory inside Appium build directory "${this.buildDir}" must contain at least one "*.class" file`);
    }
  }

  private async hasClassFile(rootPath: string): Promise<boolean> {
    let entries = await pfs.readdir(rootPath);
    for (let i = 0; i < entries.length; i++) {
      let entry = entries[i];
      let fullEntryPath = path.join(rootPath, entry);
      let stats = await pfs.stat(fullEntryPath);
      if (stats.isFile() && entry.endsWith(".class")) {
        return true;
      }
      
      if (this.hasClassFile(fullEntryPath)) {
        return true;
      }
    }

    return false;
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

  private async createAppiumManifest(): Promise<any> { 
    let result = {
      "schemaVersion": "1.0.0",
      "files": [ "pom.xml", "dependency-jars", "test-classes" ],
      "testFramework": {
        "name": "appium",
        "data": { }
      }
    };

    if (this.include) {
      for (let i = 0; i < this.include.length; i++) {
        
        let includedFile = this.include[i];
        let targetPath = path.join(this.artifactsDir, includedFile.targetPath);
        await pfs.cp(includedFile.sourcePath, targetPath);
        result.files.push(includedFile.targetPath);
      }
    }

    _.merge(result.testFramework.data, this.testParameters || {}); 

    return result;
  }
}