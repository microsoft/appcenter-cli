import { expect } from "chai";
import * as Os from "os";
import * as Fs from "async-file";
import * as Path from "path";
import * as Mkdirp from "mkdirp";
import * as Rimraf from "rimraf";
import * as _ from "lodash";
import { assertModulesIntegrated, forEachModules } from "./helpers";
import { InsertSdkInAppDelegateSwift } from "../../../../../src/commands/lib/ios/sdk-integration-steps/insert-sdk-in-app-delegate-swift";
import { XcodeIntegrationStepContext } from "../../../../../src/commands/lib/ios/xcode-sdk-integration";
import { MobileCenterSdkModule, getMobileCenterSdkModulesArray } from "../../../../../src/commands/lib/models/mobilecenter-sdk-module";

describe("InsertSdkInAppDelegateSwift", () => {
  async function runStep(content: string, sdkModules: MobileCenterSdkModule) {
    const appDelegatePath = Path.join(Os.tmpdir(), Math.random() * 10000000 + "-AppDelegate.swift");
    await Fs.writeTextFile(appDelegatePath, content);
    const context = new XcodeIntegrationStepContext(null, null, "***", sdkModules, null);
    context.appDelegateFile = appDelegatePath;
    await new InsertSdkInAppDelegateSwift().run(context);
    await context.runActions();
    return await Fs.readTextFile(appDelegatePath);
  }

  function appDelegateTemplate(importBlock?: string, startBlock?: string) {
    return `import UIKit${importBlock || ""}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {${startBlock || ""}
        return true
    }
}`;
  }

  function assertModulesIntegratedSwift(content: string, modules: MobileCenterSdkModule) {
    return assertModulesIntegrated(content, modules, moduleName => "import MobileCenter" + moduleName, modulesArray => `
        MSMobileCenter.start("***", withServices: [${modulesArray.map(x => `MS${MobileCenterSdkModule[x]}.self`).join(", ")}])`,
      appDelegateTemplate);
  }

  describe("Insert", () => {
    forEachModules((modules, modulesNames) => {
      it(modulesNames, async function () {
        const content = await runStep(appDelegateTemplate(), modules);
        assertModulesIntegratedSwift(content, modules);
      });
    });
  });

  describe("Update", async () => {
    let allModulesContent: string;

    before(async () => allModulesContent = await runStep(appDelegateTemplate(), MobileCenterSdkModule.All));

    forEachModules((modules, modulesNames) => {
      it(modulesNames, async function () {
        const content = await runStep(allModulesContent, modules);
        assertModulesIntegratedSwift(content, modules);
      });
    });
  });
});