import * as fs from "fs";
import * as path from "path";
import { prompt } from "../../util/interaction";
import RunEspressoInteractiveTestsCommand from "./lib/interactive/espresso";
import { help, CommandArgs, AppCommand, CommandResult } from "../../util/commandline";
import { Messages } from "./lib/help-messages";
import { AppCenterClient } from "../../util/apis";
import { DeviceSet } from "../../util/apis/generated/models";
import { Questions } from "inquirer";
enum TestFramework {
  "Espresso" = 1,
  "Appium" = 2,
  "XCUI" = 3,
  "Xamarin" = 4,
  "Calabash" = 5,
  "Manifest" = 6
}

@help(Messages.TestCloud.Commands.Interactive)
export default class InteractiveTestsCommand extends AppCommand {
  private interactiveArgs: string[] = [];
  private apkNames: [{ name: string; path: string }];
  private _args: CommandArgs;

  constructor(args: CommandArgs) {
    super(args);
    this._args = args;
  }

  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const configs: Promise<DeviceSet[]> = client.test.listDeviceSetsOfOwner(this.app.ownerName, this.app.appName);
    const scanPromise: Promise<void> = this.scanFolder();
    const frameworkName: TestFramework = await this.promptFramework();
    const devices: string = await this.promptDevices(await configs);
    const async: boolean = await this.isAsync();
    this.interactiveArgs.push("--devices", devices);
    if (async) {
      this.interactiveArgs.push("--async");
    }
    await scanPromise;
    const apkPath: string = await this.promptApk();
    this.interactiveArgs.push("--app-path", apkPath);

    switch (frameworkName) {
      case TestFramework.Espresso: {
        const testApkPath: string = await this.promptApk(true);
        this.interactiveArgs.push("--test-apk-path", testApkPath);
        return new RunEspressoInteractiveTestsCommand(this._args, this.interactiveArgs).run(client, portalBaseUrl);
      }
      default: throw new Error("Unknown framework name!");
    }
  }

  private async promptFramework(): Promise<TestFramework> {
    const choices = Object.keys(TestFramework).filter((k) => typeof TestFramework[k as any] === "number").map((framework) => {
      return {
        name: framework,
        value: TestFramework[framework as any]
      };
    });
    const questions: Questions = [
      {
        type: "list",
        name: "framework",
        message: "Pick a test framework",
        choices: choices
      }
    ];
    const answers: any = await prompt.question(questions);
    return answers.framework;
  }

  private async promptApk(forTest: boolean = false): Promise<string> {
    const choices = this.apkNames.map((apkName) => {
      return {
        name: apkName.name,
        value: apkName.path
      };
    });
    const questions: Questions = [
      {
        type: "list",
        name: "apkPath",
        message: forTest ? "Pick a test apk" : "Pick an app apk",
        choices: choices
      }
    ];
    const answers: any = await prompt.question(questions);
    return answers.apkPath;
  }

  private async isAsync(): Promise<boolean> {
    const questions: Questions = [
      {
        type: "list",
        name: "isAsync",
        message: "Should tests run in async mode?",
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
    return answers.isAsync === "true" ? true : false;
  }

  private sortDeviceSets(a: DeviceSet, b: DeviceSet): number {
    if (a.name > b.name) {
      return 1;
    }
    if (a.name < b.name) {
      return -1;
    }
    return 0;
  }

  private async promptDevices(configs: DeviceSet[]): Promise<string> {
    configs = configs.sort(this.sortDeviceSets);
    const choices = configs.map((config: DeviceSet) => {
      return {
        name: config.name,
        value: config.slug
      };
    });
    const questions: Questions = [
      {
        type: "list",
        name: "deviceSlug",
        message: "Pick a device set to use",
        choices: choices
      }
    ];
    const answers: any = await prompt.question(questions);
    return `${this.app.ownerName}/${answers.deviceSlug}`;
  }

  private async scanFolder(): Promise<void> {
    this.scanRecurse(process.cwd());
  }

  private scanRecurse(dirname: string) {
    const dirContent = fs.readdirSync(dirname);
    for (const dir of dirContent) {
      const fullDir = path.join(dirname, dir);
      if (fs.lstatSync(fullDir).isDirectory()) {
        if (dir !== "node_modules") {
          this.scanRecurse(fullDir);
        }
      } else {
        if (path.parse(dir).ext === ".apk") {
          const foundApk = {
            name: path.relative(process.cwd(), fullDir),
            path: fullDir
          };
          if (!this.apkNames) {
            this.apkNames = [foundApk];
          } else {
            this.apkNames.push(foundApk);
          }
        }
      }
    }
  }

}
