import * as fs from "fs";
import * as path from "path";
import { CommandArgs, CommandResult, AppCommand } from "../../../../util/commandline";
import { AppCenterClient } from "../../../../util/apis";
import { prompt, out } from "../../../../util/interaction";
import RunAppiumTestsCommand from "../../run/appium";
import { Questions } from "inquirer";
import { directoryExistsSync } from "../../../../util/misc/fs-helper";

// Used to sort the found folders in the order of their predicted probability of containing the appium tests.
// Any match level implies that the folder contains "dependency-jars" and "test-classes" with at least one .class file folders.
enum FolderMatchLevel {
  PerfectMatch = 1, // Conforms to the the exact structure (target/upload/..) and has a .jar file under the target.
  PerfectMatchNoJar = 2, // Conforms to the the exact structure (target/upload/..) but has no .jar file under the target.
  NoTargetFolder = 3, // Partly conforms to the needed structure (somefolder/upload/..) and has a .jar file under somefolder.
  NoTargetFolderNoJar = 4, // Partly conforms to the needed structure (somefolder/upload/..) but has no .jar file under somefolder.
  NoTargetNoUpload = 5, // Doesn't conform to the needed structure (target/upload/..) but has a .jar file in the parent.
  NoTargetNoUploadNoJar = 6 // Doesn't conform to the needed structure (target/upload/..) and has no .jar file in parent.
}

interface UploadFolder {
  name: string;
  path: string;
  matchLevel: FolderMatchLevel;
}

export default class RunAppiumWizardTestCommand extends AppCommand {

  private _args: CommandArgs;

  constructor(args: CommandArgs, interactiveArgs: string[]) {
    super(args);
    this._args = args;
    this._args.args.push(...interactiveArgs);
  }

  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const searchFolder: Promise<UploadFolder[]> = this.scanFolder();

    if (this._args.args.indexOf("--async") < 0) {
      const mergeXml: boolean = await this.promptMergeXml();
      if (mergeXml) {
        this._args.args.push("--merge-junit-xml");
      }
    }
    const foundFolders: UploadFolder[] = await searchFolder;
    const folder: string = await this.promptFolder(foundFolders);
    this._args.args.push("--build-dir", folder);
    out.text("\nRunning command: appcenter test run appium " + this._args.args.join(" ") + "\n");
    return new RunAppiumTestsCommand(this._args).run(client, portalBaseUrl);
  }

  private async promptMergeXml(): Promise<boolean> {
    const questions: Questions = [
      {
        type: "list",
        name: "merge",
        message: "Should the xml files be merged in to the <output.xml> file?",
        choices: [{
          name: "Yes",
          value: "true"
        }, {
          name: "No",
          value: "false"
        }]
      }
    ];
    const answers: any = await prompt.question(questions);
    return answers.merge === "true" ? true : false;
  }

  private async scanFolder(): Promise<UploadFolder[]> {
    const foundFolders: UploadFolder[] = [];
    this.scanRecurse(process.cwd(), foundFolders, -1, false, -1);
    return foundFolders;
  }

  private scanRecurse(dirname: string, folders: UploadFolder[], targetFolderParentLevel: number, uploadFolderIsParent: boolean, jarFileParentLevel: number) {
    const dirContent = fs.readdirSync(dirname);
    let containsPartRequiredData: boolean;
    for (const dir of dirContent) {
      const fullDir = path.join(dirname, dir);
      if (fs.lstatSync(fullDir).isDirectory()) {
        if (dir !== "node_modules") {

          if (targetFolderParentLevel >= 0) {
            targetFolderParentLevel++;
          }
          if (jarFileParentLevel >= 0) {
            jarFileParentLevel++;
          }
          const isTarget: boolean = dir === "target";
          if (isTarget) {
            targetFolderParentLevel = 0;
          }
          uploadFolderIsParent = dir === "upload";

          const dirContents: string[] = fs.readdirSync(fullDir);
          if (dirContents.length === 0) {
            continue;
          }
          const containsClassFiles: boolean = dirContents.some((dir) => {
            return path.parse(dir).ext === ".class";
          });
          if (dir === "dependency-jars" || (dir === "test-classes" && containsClassFiles)) {
            if (containsPartRequiredData) { // If already contains either "dependency-jars" or "test-classes"
              const matchLevel: FolderMatchLevel = this.calculateMatchLevel(targetFolderParentLevel, uploadFolderIsParent, jarFileParentLevel);
              const foundFolder: UploadFolder = {
                name: path.relative(process.cwd(), fullDir.split(dir)[0]),
                path: fullDir.split(dir)[0],
                matchLevel: matchLevel
              };
              if (!folders) {
                folders = [foundFolder];
              } else {
                folders.push(foundFolder);
              }
            } else {
              containsPartRequiredData = true;
            }
          } else {
            this.scanRecurse(fullDir, folders, targetFolderParentLevel, uploadFolderIsParent, jarFileParentLevel);
          }
        }
      } else {
        if (path.parse(dir).ext === ".jar") {
          jarFileParentLevel = 0;
        }
      }
    }
  }

  private calculateMatchLevel(targetFolderParentLevel: number, uploadFolderIsParent: boolean, jarFileParentLevel: number): FolderMatchLevel {
    if (jarFileParentLevel === 2) {
      if (targetFolderParentLevel === 2) {
        if (uploadFolderIsParent) {
          return FolderMatchLevel.PerfectMatch;
        } else {
          return FolderMatchLevel.NoTargetNoUpload;
        }
      } else {
        if (uploadFolderIsParent) {
          return FolderMatchLevel.NoTargetFolder;
        } else {
          return FolderMatchLevel.NoTargetNoUpload;
        }
      }
    } else {
      if (targetFolderParentLevel === 2) {
        if (uploadFolderIsParent) {
          return FolderMatchLevel.PerfectMatchNoJar;
        } else {
          return FolderMatchLevel.NoTargetNoUploadNoJar;
        }
      } else {
        if (uploadFolderIsParent) {
          return FolderMatchLevel.NoTargetFolderNoJar;
        } else {
          return FolderMatchLevel.NoTargetNoUploadNoJar;
        }
      }
    }
  }

  private async promptFolder(listOfFolders: UploadFolder[]): Promise<string> {
    const shownFolders: UploadFolder[] = listOfFolders.sort((folder1, folder2) => {
      if (folder1.matchLevel === folder2.matchLevel) {
        return 0;
      } else {
        return folder1.matchLevel < folder2.matchLevel ? -1 : 1;
      }
    });

    if (shownFolders.length === 0) {
      return await prompt("We could not find any folders with Appium tests. Please provide the path to them.");
    }
    const choices = shownFolders.map((folder) => {
      return {
        name: folder.name,
        value: folder.path
      };
    });
    choices.push({
      name: "Enter path manually",
      value: "manual"
    });
    const questions: Questions = [
      {
        type: "list",
        name: "folderPath",
        message: "Pick a folder with the packed Appium tests",
        choices: choices
      }
    ];
    const answers: any = await prompt.question(questions);
    if (answers.folderPath === "manual") {
      let pathIsValid: boolean;
      let dirPath: string;
      while (!pathIsValid) {
        dirPath = await prompt(`Please provide the path to the Appium tests.`);
        if (dirPath.length === 0) {
          pathIsValid = false;
        } else {
          pathIsValid = directoryExistsSync(path.resolve(dirPath));
        }
      }
      return dirPath;
    }
    return answers.folderPath;
  }
}
