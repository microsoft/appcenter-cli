import * as fs from "fs";
import * as path from "path";
import { CommandArgs, CommandResult, AppCommand } from "../../../../util/commandline";
import { AppCenterClient } from "../../../../util/apis";
import { prompt, out } from "../../../../util/interaction";
import RunUITestsCommand from "../../run/uitest";
import { Questions } from "inquirer";
import { directoryExistsSync } from "../../../../util/misc/fs-helper";

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

      if (!fs.lstatSync(fullDir).isDirectory()) {
        continue;
      }
      if (dir === "node_modules") {
        continue;
      }
      const subDirContent: string[] = fs.readdirSync(fullDir);

      if (subDirContent.length === 0) {
        continue;
      }
      const xamarinNunitDll = this.findXamarinNunitDll(subDirContent);
      if (!xamarinNunitDll) {
        await this.scanRecurse(fullDir, folders);
      } else {
        const foundFolder: BuildFolder = {
          name: path.relative(process.cwd(), fullDir),
          path: fullDir
        };
        if (!folders) {
          folders = [foundFolder];
        } else {
          folders.push(foundFolder);
        }
      }
    }
  }

  private findXamarinNunitDll(dirContent: string[]): boolean {
    return dirContent.indexOf("Xamarin.UITest.dll") > -1 && dirContent.indexOf("nunit.framework.dll") > -1;
  }

  private async promptFolder(listOfFolders: BuildFolder[]): Promise<string> {
    if (listOfFolders.length === 0) {
      return await prompt("We could not find any folders with Xamarin tests. Please provide the path to them.");
    }
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
        message: "Pick the folder containing your compiled Xamarin.UITest tests",
        choices: choices
      }
    ];
    const answers: any = await prompt.question(questions);
    if (answers.folderPath === "manual") {
      let pathIsValid: boolean;
      let dirPath: string;
      while (!pathIsValid) {
        dirPath = await prompt(`Please provide the path to the folder containing your compiled Xamarin.UITest tests.`);
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
