import { expect } from "chai";
import * as Os from "os";
import * as Fs from "async-file";
import * as Path from "path";
import * as Mkdirp from "mkdirp";
import * as Rimraf from "rimraf";
import { assertModulesIntegrated, forEachModules } from "./helpers";
import { InsertSdkInAppDelegateObjectiveC } from "../../../../../src/commands/lib/ios/sdk-integration-steps/insert-sdk-in-app-delegate-objective-c";
import { XcodeIntegrationStepContext } from "../../../../../src/commands/lib/ios/xcode-sdk-integration";
import { MobileCenterSdkModule } from "../../../../../src/commands/lib/models/mobilecenter-sdk-module";

describe("InsertSdkInAppDelegateObjectiveC", () => {
  async function runStep(content: string, sdkModules: MobileCenterSdkModule) {
    const appDelegatePath = Path.join(Os.tmpdir(), Math.random() * 10000000 + "-AppDelegate.m");
    await Fs.writeTextFile(appDelegatePath, content);
    const context = new XcodeIntegrationStepContext(null, null, "***", sdkModules, null);
    context.appDelegateFile = appDelegatePath;
    await new InsertSdkInAppDelegateObjectiveC().run(context);
    await context.runActions();
    return await Fs.readTextFile(appDelegatePath);
  }

  function assertModulesIntegratedObjectiveC(content: string, modules: MobileCenterSdkModule) {
    return assertModulesIntegrated(content, modules, moduleName => `@import MobileCenter${moduleName};`, modulesArray => `
    [MSMobileCenter start:@"***" withServices:@[${modulesArray.map(x => `[MS${MobileCenterSdkModule[x]} class]`).join(", ")}]];`,
      appDelegateTemplate);
  }

  function appDelegateTemplate(importBlock?: string, startBlock?: string) {
    return `#import "AppDelegate.h"${importBlock || ""}

@interface AppDelegate ()
@end

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {${startBlock || ""}
    return YES;
}
@end`;
  }

  describe("Insert", () => {
    forEachModules((modules, modulesNames) => {
      it(modulesNames, async function () {
        const content = await runStep(appDelegateTemplate(), modules);
        assertModulesIntegratedObjectiveC(content, modules);
      });
    });
  });

  describe("Update", async () => {
    let allModulesContent: string;

    before(async () => allModulesContent = await runStep(appDelegateTemplate(), MobileCenterSdkModule.All));

    forEachModules((modules, modulesNames) => {
      it(modulesNames, async function () {
        const content = await runStep(allModulesContent, modules);
        assertModulesIntegratedObjectiveC(content, modules);
      });
    });
  });
});