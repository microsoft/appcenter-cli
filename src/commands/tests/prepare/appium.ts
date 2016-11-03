import { Command, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn } from "../../../util/commandLine";
import { out } from "../../../util/interaction";
import * as outExtensions from "../lib/interaction";
import { getUser } from "../../../util/profile";
import * as path from "path";
import * as fs from "fs";

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
      await outExtensions.progressWithResult("Validating workspace", this.validateAppiumWorkspace());

      let manifestPath = path.join(this.workspacePath, "test-manifest.json");
      let manifest = JSON.stringify(this.getAppiumManifest(), null, 1);
      await outExtensions.progressWithResult("Creating manifest file", this.writeToFile(manifestPath, manifest));

      out.text(`Appium tests are ready to run. Manifest file was written to ${manifestPath}.`);
      return success();
    } 
    catch (err) {
      return failure(1, err.message);
    }
  }

  private async validateAppiumWorkspace(): Promise<void> {
    await this.validateWorkspaceExists();
    await this.validatePomFile();
    await this.validateDependencyJarsDirectory();
    await this.validateTestClassedDirectory();
  }

  private validateWorkspaceExists(): Promise<void> {
    return this.validatePathExists(
      this.workspacePath,
      false,
      `Workspace directory "${this.workspacePath}"" doesn't exist`);
  }

  private validatePomFile(): Promise<void> {    
    return this.validatePathExists(
      path.join(this.workspacePath, "pom.xml"),
      true,
      'The Appium workspace directory must contain file "pom.xml"');
  }

  private validateDependencyJarsDirectory(): Promise<void> {
    return this.validatePathExists(
      path.join(this.workspacePath, "dependency-jars"),
      false,
      'The Appium workspace directory must contain directory "dependency-jars"');
  }

  private validateTestClassedDirectory(): Promise<void> {
    return this.validatePathExists(
      path.join(this.workspacePath, "test-classes"),
      false,
      `The Appium workspace directory must contain directory "test-classes"`);
  }

  private async validatePathExists(path: string, isFile: boolean, errorMessage: string): Promise<void> {
    let stats: fs.Stats = null;
    
    try {
      stats = await new Promise<fs.Stats>((resolve, reject) => {
        fs.stat(path, (err, stats) => {
          if (err) {
            reject(err);
          }
          else {
            resolve(stats);
          }
        });
      });
    }
    catch (err) {
      throw new Error(errorMessage);
    }

    if (isFile !== stats.isFile()) {
      throw new Error(errorMessage);
    }
  }

  private writeToFile(path: string, content: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(path, content, (err, _) => {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
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