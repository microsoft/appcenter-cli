import * as fs from "fs";
import * as path from "path";
import { CommandArgs, CommandResult, AppCommand } from "../../../../util/commandline";
import { AppCenterClient } from "../../../../util/apis";
import { prompt, out } from "../../../../util/interaction";
import RunUITestsCommand from "../../run/uitest";
import { Questions } from "inquirer";
import { UITestPreparer } from "../uitest-preparer";

interface BuildFolder {
  name: string;
  path: string;
}

export default class RunUitestWizardTestCommand extends AppCommand {
  private _args: CommandArgs;

  constructor(args: CommandArgs, interactiveArgs: string[]) {
    super(args);
    this._args = args;
    this._args.args.push(...interactiveArgs);
  }

  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const searchFolder: Promise<BuildFolder[]> = this.scanFolder();

    if (this._args.args.indexOf("--async") < 0) {
      const mergeXml: boolean = await this.promptMergeXml();
      if (mergeXml) {
        this._args.args.push("--merge-nunit-xml");
      }
    }

    const foundFolders: BuildFolder[] = await searchFolder;
    const folder: string = await this.promptFolder(foundFolders);
    this._args.args.push("--build-dir", folder);
    out.text("\nRunning command: appcenter test run uitest " + this._args.args.join(" ") + "\n");
    return new RunUITestsCommand(this._args).run(client, portalBaseUrl);
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

  private async scanFolder(): Promise<BuildFolder[]> {
    const foundFolders: BuildFolder[] = [];
    await this.scanRecurse(process.cwd(), foundFolders);
    return foundFolders;
  }

  private async scanRecurse(dirname: string, folders: BuildFolder[]) {
    const dirContent = fs.readdirSync(dirname);
    for (const dir of dirContent) {
      const fullDir = path.join(dirname, dir);

      if (fs.lstatSync(fullDir).isDirectory()) {
        if (dir !== "node_modules") {
          const dirContents: string[] = fs.readdirSync(fullDir);

          if (dirContents.length > 0) {
            const configs = dirContents.filter((file) => {
              return file === "packages.config";
            });
            const projects = dirContents.filter((file) => {
              const extension: string = path.parse(file).ext;
              return extension === ".csproj" || extension === ".fsproj";
            });
            const containsConfigAndProjectFiles: boolean = configs.length > 0 && projects.length > 0;

            if (containsConfigAndProjectFiles) {
              let containsTools: boolean = true;
              try {
                await UITestPreparer.findXamarinUITestNugetDir(fullDir, fullDir);
              } catch (e) {
                containsTools = false;
              }

              if (containsTools) {
                const foundFolder: BuildFolder = {
                  name: path.relative(process.cwd(), fullDir.split(dir)[0]),
                  path: fullDir.split(dir)[0]
                };
                if (!folders) {
                  folders = [foundFolder];
                } else {
                  folders.push(foundFolder);
                }
              }
            } else {
              await this.scanRecurse(fullDir, folders);
            }
          }
        }
      }
    }
  }

  private async promptFolder(listOfFolders: BuildFolder[]): Promise<string> {
    if (listOfFolders.length) {
      const choices = listOfFolders.map((folder) => {
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
          message: "Pick a folder with the Xamarin tests",
          choices: choices
        }
      ];
      const answers: any = await prompt.question(questions);
      if (answers.apkPath === "manual") {
        return await prompt("Please provide the path to the Xamarin tests.");
      }
      return answers.folderPath;
    } else {
      return await prompt("We could not find any folders with Xamarin tests. Please provide the path to them.");
    }
  }
}
