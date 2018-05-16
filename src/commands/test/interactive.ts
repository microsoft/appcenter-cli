import * as fs from "fs";
import * as path from "path";
import { prompt, out } from "../../util/interaction";
import RunEspressoInteractiveTestsCommand from "./lib/interactive/espresso";
import { help, CommandArgs, AppCommand, CommandResult } from "../../util/commandline";
import { Messages } from "./lib/help-messages";
import { AppCenterClient } from "../../util/apis";
import { DeviceSet, DeviceConfiguration } from "../../util/apis/generated/models";
import { Questions } from "inquirer";
import { DeviceConfigurationSort } from "./lib/deviceConfigurationSort";
enum TestFramework {
  "Espresso" = 1,
  "Appium" = 2,
  "XCUI" = 3,
  "Xamarin" = 4,
  "Calabash" = 5,
  "Manifest" = 6
}

interface ApkFile {
  name: string;
  path: string;
}

@help(Messages.TestCloud.Commands.Interactive)
export default class InteractiveTestsCommand extends AppCommand {
  private interactiveArgs: string[] = [];
  private _args: CommandArgs;

  constructor(args: CommandArgs) {
    super(args);
    this._args = args;
  }

  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const getDeviceSets: Promise<DeviceSet[]> = client.test.listDeviceSetsOfOwner(this.app.ownerName, this.app.appName);
    const searchApks: Promise<ApkFile[]> = this.scanFolder();
    const frameworkName: TestFramework = await this.promptFramework();

    const devices: string = await this.promptDevices(await getDeviceSets, client);
    this.interactiveArgs.push("--devices", devices);

    const async: boolean = await this.isAsync();
    if (async) {
      this.interactiveArgs.push("--async");
    }

    const listOfApks: ApkFile[] = await searchApks;
    const apkPath: string = await this.promptApk(listOfApks);
    this.interactiveArgs.push("--app-path", apkPath);

    switch (frameworkName) {
      case TestFramework.Espresso: {
        const testApkPath: string = await this.promptApk(listOfApks, true);
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

  private async promptApk(listOfApks: ApkFile[], forTest: boolean = false): Promise<string> {
    const choices = listOfApks.map((apkName) => {
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

  private async getDevices(client: AppCenterClient): Promise<DeviceConfiguration[]> {
    const configs: DeviceConfiguration[] = await client.test.getDeviceConfigurations(this.app.ownerName, this.app.appName);
    // Sort devices list like it is done on AppCenter Portal
    return configs.sort(DeviceConfigurationSort.compare);
  }

  private async promptDevices(deviceSets: DeviceSet[], client: AppCenterClient): Promise<string> {
    let choices;
    const noDeviceSets: boolean = deviceSets.length === 0;
    if (noDeviceSets) {
      const devices = await out.progress("No device sets: getting list of devices...", this.getDevices(client));
      choices = devices.map((config: DeviceConfiguration) => {
        return {
          name: config.name,
          value: config.id
        };
      });
    } else {
      deviceSets = deviceSets.sort(this.sortDeviceSets);
      choices = deviceSets.map((config: DeviceSet) => {
        return {
          name: config.name,
          value: config.slug
        };
      });
    }
    const questions: Questions = [
      {
        type: "list",
        name: "deviceSlug",
        message: noDeviceSets ? "Pick a device to use" : "Pick a device set to use",
        choices: choices
      }
    ];
    const answers: any = await prompt.question(questions);
    let deviceId: string;
    if (noDeviceSets) {
      const deviceSelection: any = await client.test.createDeviceSelection(this.app.ownerName, this.app.appName, [answers.deviceSlug]);
      deviceId = deviceSelection.shortId;
    } else {
      deviceId = `${this.app.ownerName}/${answers.deviceSlug}`;
    }
    return deviceId;
  }

  private async scanFolder(): Promise<ApkFile[]> {
    const apkNames: ApkFile[] = [];
    this.scanRecurse(process.cwd(), apkNames);
    return apkNames;
  }

  private scanRecurse(dirname: string, apkNames: ApkFile[]) {
    const dirContent = fs.readdirSync(dirname);
    for (const dir of dirContent) {
      const fullDir = path.join(dirname, dir);
      if (fs.lstatSync(fullDir).isDirectory()) {
        if (dir !== "node_modules") {
          this.scanRecurse(fullDir, apkNames);
        }
      } else {
        if (path.parse(dir).ext === ".apk") {
          const foundApk = {
            name: path.relative(process.cwd(), fullDir),
            path: fullDir
          };
          if (!apkNames) {
            apkNames = [foundApk];
          } else {
            apkNames.push(foundApk);
          }
        }
      }
    }
  }
}
