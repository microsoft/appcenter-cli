import { Command, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn } from "../../../util/commandLine";
import { out } from "../../../util/interaction";
import * as tcOut from "../lib/interaction";
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
    await tcOut.progressWithResult("Validating workspace", this.validateAppiumWorkspace());

    let manifestPath = path.join(this.workspacePath, "test-manifest.json");
    let manifest = JSON.stringify(this.getAppiumManifest(), null, 1);
    await tcOut.progressWithResult("Creating manifest file", this.writeToFile(manifestPath, manifest));

    out.text(`Appium tests are ready to run. Manifest file was written to ${manifestPath}.`);

    return success();
  }

  private async validateAppiumWorkspace(): Promise<void> {

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