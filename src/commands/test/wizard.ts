import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { prompt, out } from "../../util/interaction";
import { Questions } from "inquirer";
import { help, CommandArgs, AppCommand, CommandResult } from "../../util/commandline";
import { Messages } from "./lib/help-messages";
import { AppCenterClient, clientCall, models } from "../../util/apis";
import { DeviceSet, DeviceConfiguration, AppResponse } from "../../util/apis/generated/models";
import { DeviceConfigurationSort } from "./lib/deviceConfigurationSort";
import RunEspressoWizardTestCommand from "./lib/wizard/espresso";
import RunAppiumWizardTestCommand from "./lib/wizard/appium";
import RunUitestWizardTestCommand from "./lib/wizard/uitest";
import RunXCUIWizardTestCommand from "./lib/wizard/xcuitest";
import { fileExistsSync } from "../../util/misc";
import { DefaultApp, toDefaultApp } from "../../util/profile";

enum TestFramework {
  "Espresso" = 1,
  "Appium" = 2,
  "XCUITest" = 3,
  "Xamarin.UITest" = 4,
  "Calabash" = 5,
  "Manifest" = 6
}

interface AppFile {
  name: string; // To be displayed to user.
  path: string; // Full path.
}

@help(Messages.TestCloud.Commands.Wizard)
export default class WizardTestCommand extends AppCommand {

  private interactiveArgs: string[] = [];
  private _args: CommandArgs;
  private isAndroidApp: boolean;
  private _selectedApp: DefaultApp = null;

  constructor(args: CommandArgs) {
    super(args);
    this._args = args;
  }

  private async selectApp(client: AppCenterClient): Promise<DefaultApp> {
    if (!this._selectedApp) {
      try {
        this._selectedApp = super.app;
      } catch (e) {
        // no app was provided/found, so we will prompt the user
        this._selectedApp = await this.getApps(client);
        this.interactiveArgs.push("--app", this._selectedApp.identifier);
      }
    }
    return this._selectedApp;
  }

  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const app = await this.selectApp(client);

    const getDeviceSets: Promise<DeviceSet[]> = client.test.listDeviceSetsOfOwner(app.ownerName, app.appName);
    const getAppOS: Promise<AppResponse> = client.apps.get(app.ownerName, app.appName);
    this.isAndroidApp = (await getAppOS).os.toLowerCase() === "android";

    const frameworkName: TestFramework = await this.promptFramework();
    const searchApps: Promise<AppFile[]> = this.scanFolder();

    const devices: string = await this.promptDevices(await getDeviceSets, app, client);
    this.interactiveArgs.push("--devices", devices);

    const async: boolean = await this.isAsync();
    if (async) {
      this.interactiveArgs.push("--async");
    }

    const listOfAppFiles: AppFile[] = await searchApps;
    const appPath: string = await this.promptAppFile(listOfAppFiles);
    this.interactiveArgs.push("--app-path", appPath);

    switch (frameworkName) {
      case TestFramework.Espresso: {
        const testApkPath: string = await this.promptAppFile(listOfAppFiles, true);
        this.interactiveArgs.push("--test-apk-path", testApkPath);
        return new RunEspressoWizardTestCommand(this._args, this.interactiveArgs).run(client, portalBaseUrl);
      }
      case TestFramework.XCUITest: {
        const testIpaPath: string = await this.promptAppFile(listOfAppFiles, true);
        this.interactiveArgs.push("--test-ipa-path", testIpaPath);
        return new RunXCUIWizardTestCommand(this._args, this.interactiveArgs).run(client, portalBaseUrl);
      }
      case TestFramework.Appium: {
        return new RunAppiumWizardTestCommand(this._args, this.interactiveArgs).run(client, portalBaseUrl);
      }
      case TestFramework["Xamarin.UITest"]: {
        return new RunUitestWizardTestCommand(this._args, this.interactiveArgs).run(client, portalBaseUrl);
      }
      case TestFramework.Calabash: {
        this.printCalabashHelp();
        return { succeeded: true };
      }
      case TestFramework.Manifest: {
        this.printManifestHelp();
        return { succeeded: true };
      }
      default: throw new Error("Unknown framework name!");
    }
  }

  private async promptFramework(): Promise<TestFramework> {
    const choices = Object.keys(TestFramework).filter((framework) => {
      if (this.isAndroidApp && framework === "XCUITest") {
        return false;
      }
      if (!this.isAndroidApp && framework === "Espresso") {
        return false;
      }
      return typeof TestFramework[framework as any] === "number";
    }).map((framework) => {
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

  private async promptAppFile(listOfAppFiles: AppFile[], forTest: boolean = false): Promise<string> {
    if (listOfAppFiles.length === 0) {
      return await prompt(`We could not find any app files inside the current folder. Please provide the path to the ${forTest ? "test app" : "app"}.`);
    }
    const choices = listOfAppFiles.map((appName) => {
      return {
        name: appName.name,
        value: appName.path
      };
    });

    choices.push({
      name: "Enter path manually",
      value: "manual"
    });
    const questions: Questions = [
      {
        type: "list",
        name: "appPath",
        message: forTest ? "Pick a test app" : "Pick an app",
        choices: choices
      }
    ];
    const answers: any = await prompt.question(questions);
    if (answers.appPath === "manual") {
      let pathIsValid: boolean;
      let filePath: string;
      while (!pathIsValid) {
        filePath = await prompt(`Please provide the path to the ${forTest ? "test app" : "app"}.`);
        if (filePath.length === 0) {
          pathIsValid = false;
        } else {
          pathIsValid = fileExistsSync(path.resolve(filePath));
        }
      }
      return filePath;
    }
    return answers.appPath;
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

  private async getDevices(client: AppCenterClient, app: DefaultApp): Promise<DeviceConfiguration[]> {
    const configs: DeviceConfiguration[] = await client.test.getDeviceConfigurations(app.ownerName, app.appName);

    // Sort devices list like it is done on AppCenter Portal
    return configs.sort(DeviceConfigurationSort.compare);
  }

  private async getApps(client: AppCenterClient): Promise<DefaultApp> {
    const apps = await out.progress("Getting list of apps...", clientCall<models.AppResponse[]>((cb) => client.apps.list(cb)));
    const choices = apps.map((app: models.AppResponse) => {
      return {
        name: app.name,
        value: `${app.owner.name}/${app.name}`
      };
    });

    const question: Questions = [
      {
        type: "list",
        name: "app",
        message: "Pick an app to use",
        choices: choices
      }
    ];

    const answer: any = await prompt.question(question);
    return toDefaultApp(answer.app);
  }

  private async promptDevices(deviceSets: DeviceSet[], app: DefaultApp, client: AppCenterClient): Promise<string> {
    let choices;
    const noDeviceSets: boolean = deviceSets.length === 0;

    if (noDeviceSets) {
      const devices = await out.progress("Getting list of devices...", this.getDevices(client, app));
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
      choices.push({
        name: "I want to use a single device",
        value: "manual"
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
      const deviceSelection: any = await client.test.createDeviceSelection(app.ownerName, app.appName, [answers.deviceSlug]);
      deviceId = deviceSelection.shortId;
    } else {
      if (answers.deviceSlug === "manual") {
        return await this.promptDevices([], app, client);
      } else {
        deviceId = `${app.ownerName}/${answers.deviceSlug}`;
      }
    }
    return deviceId;
  }

  private async scanFolder(): Promise<AppFile[]> {
    const appNames: AppFile[] = [];
    this.scanRecurse(process.cwd(), appNames);
    return appNames;
  }

  private scanRecurse(dirname: string, appNames: AppFile[]) {
    const dirContent = fs.readdirSync(dirname);
    for (const dir of dirContent) {
      const fullDir = path.join(dirname, dir);
      if (fs.lstatSync(fullDir).isDirectory()) {
        if (dir !== "node_modules") {
          this.scanRecurse(fullDir, appNames);
        }
      } else {
        if (this.isApplicationFile(dir)) {
          const foundApp = {
            name: path.relative(process.cwd(), fullDir),
            path: fullDir
          };
          if (!appNames) {
            appNames = [foundApp];
          } else {
            appNames.push(foundApp);
          }
        }
      }
    }
  }

  private isApplicationFile(file: string): boolean {
    const fileExtension: string = path.parse(file).ext;
    return (this.isAndroidApp && fileExtension === ".apk") || (!this.isAndroidApp && fileExtension === ".ipa");
  }

  private printCalabashHelp() {
    out.text(os.EOL + `Interactive mode is not supported. Usage: appcenter test run calabash ${this.interactiveArgs.join(" ")}` +
      os.EOL + os.EOL + "Additional parameters: " +
      os.EOL + `--project-dir: ${Messages.TestCloud.Arguments.CalabashProjectDir}` +
      os.EOL + `--sign-info: ${Messages.TestCloud.Arguments.CalabashSignInfo}` +
      os.EOL + `--config-path: ${Messages.TestCloud.Arguments.CalabashConfigPath}` +
      os.EOL + `--profile: ${Messages.TestCloud.Arguments.CalabashProfile}` +
      os.EOL + `--skip-config-check: ${Messages.TestCloud.Arguments.CalabashSkipConfigCheck}`);
  }

  private printManifestHelp() {
    out.text(os.EOL + `Interactive mode is not supported. Usage: appcenter test run manifest ${this.interactiveArgs.join(" ")}` +
      os.EOL + os.EOL + "Additional parameters: " +
      os.EOL + `--manifest-path: Path to manifest file` +
      os.EOL + `--merged-file-name: ${Messages.TestCloud.Arguments.MergedFileName}`);
  }
}
