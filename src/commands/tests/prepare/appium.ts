import { Command, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn, ErrorCodes } from "../../../util/commandLine";
import { out } from "../../../util/interaction";
import * as outExtensions from "../lib/interaction";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";
import * as path from "path";
import * as fs from "fs";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as glob from "glob";
import * as _ from "lodash";

@help("Prepares Appium artifacts for test run")
export default class PrepareAppiumCommand extends Command {
  @help("Path to output directory where all test files will be copied")
  @longName("artifacts-dir")
  @hasArg
  artifactsDir: string;

  @help("Path to Appium output directory (usually target/upload)")
  @longName("build-dir")
  @hasArg
  buildDir: string;

  @help("Path to Appium test project that should be built")
  @longName("project-dir")
  @hasArg
  projectDir: string;

  @help("Additional files / directories that should be included in the test run. The value should be in format 'sourceDir=targetDir'")
  @longName("include")
  @hasArg
  include: string[];

  @help("Additional test parameters that should be included in the test run. The value should be in format key=value")
  @longName("test-parameter")
  @shortName("p")
  @hasArg
  testParameters: string[];

  constructor(args: CommandArgs) {
    super(args);
    if (typeof this.testParameters === "string") {
      this.testParameters = [ this.testParameters ];
    }

    if (typeof this.include === "string") {
      this.include = [ this.include ];
    }
  }

  public async runNoClient(): Promise<CommandResult> {
    try {
      this.validateEitherProjectOrBuildDir();
      if (this.projectDir) {
        this.buildDir = await this.generateBuildDirFromProject();
      }

      this.validateBuildDir();

      if (!this.artifactsDir) {
        this.artifactsDir = this.buildDir;
      }
      else {
        await pfs.copyDir(this.buildDir, this.artifactsDir);
      }

      let manifestPath = path.join(this.artifactsDir, "test-manifest.json");
      let manifest = await this.createAppiumManifest();
      let manifestJson = JSON.stringify(manifest, null, 1);
      await pfs.writeFile(manifestPath, manifestJson);

      out.text(`Appium tests are ready to run. Manifest file was written to ${manifestPath}.`);
      return success();
    } 
    catch (err) {
      return failure(ErrorCodes.Exception, err.message);
    }
  }

  private validateEitherProjectOrBuildDir() {
    if ((this.projectDir && this.buildDir) || !(this.projectDir || this.buildDir)) {
      throw new Error("You must specify either project or build directory");
    }
  }

  private validateProjectDir() {
    this.validatePathExists(
      this.projectDir, 
      false, 
      `Project directory ${this.projectDir} doesn't exist`);
  }

  private async generateBuildDirFromProject(): Promise<string> {
    throw "Not implemented";
  }

  private validateBuildDir() {
    this.validateBuildDirExists();
    this.validatePomFile();
    this.validateDependencyJarsDirectory();
    this.validateTestClassesDirectory();
  }

  private validateBuildDirExists() {
    this.validatePathExists(
      this.buildDir,
      false,
      `Appium build directory "${this.buildDir}"" doesn't exist`);
  }

  private validatePomFile() {    
    this.validatePathExists(
      path.join(this.buildDir, "pom.xml"),
      true,
      `Appium build directory "${this.buildDir}" must contain file "pom.xml"`);
  }

  private validateDependencyJarsDirectory() {
    this.validatePathExists(
      path.join(this.buildDir, "dependency-jars"),
      false,
      `Appium build directory "${this.buildDir}" must contain directory "dependency-jars"`);
  }

  private validateTestClassesDirectory() {
    let testClassesDir = path.join(this.buildDir, "test-classes");
    this.validatePathExists(
      path.join(this.buildDir, "test-classes"),
      false,
      `Appium build directory "${this.buildDir}" must contain directory "test-classes"`);

    if (!this.hasClassFile(testClassesDir)) {
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
      let parsedIncludedFiles = parseIncludedFiles(this.include);
      for (let i = 0; i < parsedIncludedFiles.length; i++) {
        
        let includedFile = parsedIncludedFiles[i];
        let targetPath = path.join(this.artifactsDir, includedFile.targetPath);
        await pfs.copy(includedFile.sourcePath, targetPath);
        result.files.push(includedFile.targetPath);
      }
    }

    let parsedParameters = parseTestParameters(this.testParameters);
    _.merge(result.testFramework.data, parsedParameters); 

    return result;
  }
}