import { Command, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn } from "../../../util/commandLine";
import { out } from "../../../util/interaction";
import * as outExtensions from "../lib/interaction";
import { getUser } from "../../../util/profile";
import * as path from "path";
import * as fs from "fs";
import * as glob from "glob";

export default class PrepareAppiumCommand extends Command {
  @longName("workspace-path")
  @required
  @hasArg
  workspacePath: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(): Promise<CommandResult> {
    try {
      this.validateAppiumWorkspace();

      let manifestPath = path.join(this.workspacePath, "test-manifest.json");
      let manifest = JSON.stringify(this.getAppiumManifest(), null, 1);
      fs.writeFileSync(manifestPath, manifest);

      out.text(`Appium tests are ready to run. Manifest file was written to ${manifestPath}.`);
      return success();
    } 
    catch (err) {
      return failure(1, err.message);
    }
  }

  private validateAppiumWorkspace() {
    this.validateWorkspaceExists();
    this.validatePomFile();
    this.validateDependencyJarsDirectory();
    this.validateTestClassedDirectory();
  }

  private validateWorkspaceExists() {
    this.validatePathExists(
      this.workspacePath,
      false,
      `Workspace directory "${this.workspacePath}"" doesn't exist`);
  }

  private validatePomFile() {    
    this.validatePathExists(
      path.join(this.workspacePath, "pom.xml"),
      true,
      'The Appium workspace directory must contain file "pom.xml"');
  }

  private validateDependencyJarsDirectory() {
    this.validatePathExists(
      path.join(this.workspacePath, "dependency-jars"),
      false,
      'The Appium workspace directory must contain directory "dependency-jars"');
  }

  private validateTestClassedDirectory() {
    let testClassesDir = path.join(this.workspacePath, "test-classes");
    this.validatePathExists(
      path.join(this.workspacePath, "test-classes"),
      false,
      `The Appium workspace directory must contain directory "test-classes"`);

    if (!this.hasClassFile(testClassesDir)) {
      throw new Error('The "test-classes" directory inside Appium workspace must contain at least one "class" file');
    }
  }

  private hasClassFile(rootPath: string): boolean {
    let entries = fs.readdirSync(rootPath);
    for (let i = 0; i < entries.length; i++) {
      
      let entry = entries[i];
      let stats = fs.statSync(path.join(rootPath, entry));
      if (stats.isFile() && entry.endsWith(".class")) {
        return true;
      }
      
      if (this.hasClassFile(entry)) {
        return true;
      }
    }

    return false;
  } 

  private validatePathExists(path: string, isFile: boolean, errorMessage: string) {
    let stats: fs.Stats = null;
    
    try {
      stats = fs.statSync(path);
    }
    catch (err) {
      throw new Error(errorMessage);
    }

    if (isFile !== stats.isFile()) {
      throw new Error(errorMessage);
    }
  }

  private getAppiumManifest(): any { 
    return {
      "schemaVersion": "1.0.0",
      "files": [ "pom.xml", "dependency-jars", "test-classes" ],
      "testFramework": {
        "name": "appium"
      }
    }
  }
}