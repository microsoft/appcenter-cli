import { expect } from "chai";
import * as Os from "os";
import * as Fs from "async-file";
import * as Path from "path";
import * as _ from "lodash";

import { AddCocoapodsDependencies } from "../../../../../src/commands/lib/ios/sdk-integration-steps/add-cocoapods-dependencies";
import { XcodeIntegrationStepContext } from "../../../../../src/commands/lib/ios/xcode-sdk-integration";
import { MobileCenterSdkModule, getMobileCenterSdkModulesArray } from "../../../../../src/commands/lib/models/mobilecenter-sdk-module";
import { forEachModules } from "./helpers";

describe("AddCocoapodsDependencies", () => {
  async function runStep(podfileContent: string, sdkModules: MobileCenterSdkModule, sdkVersion?: string) {
    const podfilePath = Path.join(Os.tmpdir(), Math.random() * 10000000 + "-Podfile");
    if (podfileContent) {
      await Fs.writeTextFile(podfilePath, podfileContent);
    }

    const context = new XcodeIntegrationStepContext(Os.tmpdir(), podfilePath, "***", sdkModules, sdkVersion);
    context.projectRootDirectory = Path.join(context.projectOrWorkspacePath, "../");
    context.projectName = "TestProject";
    await new AddCocoapodsDependencies().run(context);
    await context.runActions();
    const content = context.podfilePath && Fs.readTextFile(context.podfilePath);
    if (context.podfilePath) {
      await Fs.delete(context.podfilePath);
    }

    return content;
  }

  function assesrtPodDepsIntegrated(content: string, modules: MobileCenterSdkModule) {
    const lines = content.split(/\r?\n/);
    const injectedModules: MobileCenterSdkModule[] = [];
    const modulesArray = getMobileCenterSdkModulesArray(modules);
    let targetTestProjectActive = false;
    for (const line of lines) {
      if (!targetTestProjectActive && /target\s+?:?['\u2018\u2019"]?TestProject['\u2018\u2019"]?\s+?do/.test(line))
      {
        targetTestProjectActive = true;
      }

      if (targetTestProjectActive && line.trim() === "end")
      {
        break;
      }

      if (targetTestProjectActive) {
        for (const module of modulesArray) {
          if (line.trim() === `pod 'MobileCenter/MobileCenter${MobileCenterSdkModule[module]}'`) {
            injectedModules.push(module);
          }
        }
      }
    }

    expect(_.isEqual(modulesArray, injectedModules.sort())).to.eq(true);
  }

  function podfileTemplate(modules: MobileCenterSdkModule, getPod?: (module: MobileCenterSdkModule) => string, target = "'TestProject'") {
    const modulesArray = getMobileCenterSdkModulesArray(modules);
    if (!getPod) {
      getPod = module => `pod 'MobileCenter/MobileCenter${MobileCenterSdkModule[module]}'`;
    }

    const pods = modulesArray.length > 0 ? ("\n" + modulesArray.map(module => getPod(module)).join("\n")) : "";

    return `target ${target} do
  use_frameworks!${ pods }
end`;
  }

  describe("Create new Podfile", () => {
    forEachModules((modules, modulesNames) => {
      it(modulesNames, async function () {
        const content = await runStep(null, modules);
        assesrtPodDepsIntegrated(content, modules);
      });
    });
  });

  describe("Update Podfile", () => {
    let testContent: string = podfileTemplate(MobileCenterSdkModule.All);

    forEachModules((modules, modulesNames) => {
      it(modulesNames, async function () {
        const content = await runStep(testContent, modules);
        assesrtPodDepsIntegrated(content, modules);
      });
    });
  });

  describe("Update Podfile with nested target", () => {
    let testContent: string = podfileTemplate(MobileCenterSdkModule.All,
      module => {
        switch (module) {
          case MobileCenterSdkModule.Analytics: return `pod \u2018MobileCenter/MobileCenter${MobileCenterSdkModule[module]}\u2019`;
          case MobileCenterSdkModule.Crashes: return `pod "MobileCenter/MobileCenter${MobileCenterSdkModule[module]}"`;
          case MobileCenterSdkModule.Distribute: return `# pod 'MobileCenter/MobileCenter${MobileCenterSdkModule[module]}'`;
          default: return `pod 'MobileCenter/MobileCenter${MobileCenterSdkModule[module]}'`
        }
      }, `:TestProject`);

    forEachModules((modules, modulesNames) => {
      it(modulesNames, async function () {
        const content = await runStep(testContent, modules);
        assesrtPodDepsIntegrated(content, modules);
      });
    });
  });
});