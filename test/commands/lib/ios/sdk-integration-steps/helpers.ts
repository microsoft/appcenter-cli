import { expect } from "chai";
import * as _ from "lodash";
import { MobileCenterSdkModule, getMobileCenterSdkModulesArray } from "../../../../../src/commands/lib/models/mobilecenter-sdk-module";

export function assertModulesIntegrated(
  content: string,
  modules: MobileCenterSdkModule,
  getImportBlock: (moduleName: string) => string,
  getStartBlock: (modulesArray: MobileCenterSdkModule[]) => string,
  getTemplate: (importBlock?: string, startBlock?: string) => string) {

  const lines = content.split(/\r?\n/);
  const filteredLines: string[] = [];
  const modulesArray = _.concat([0], getMobileCenterSdkModulesArray(modules));
  const injectedModules: MobileCenterSdkModule[] = [];
  let stopImport = false;
  for (const line of lines) {
    if (!stopImport && line.trim().length === 0) {
      stopImport = true;
    }

    if (!stopImport) {
      for (const module of modulesArray) {
        const moduleName = MobileCenterSdkModule[module] === "None" ? "" : MobileCenterSdkModule[module];
        if (line.trim() === getImportBlock(moduleName)) {
          injectedModules.push(module);
        }
      }
    }

    if (stopImport || (!line.startsWith("import MobileCenter") && !line.startsWith("@import MobileCenter"))) {
      filteredLines.push(line);
    }
  }

  expect(_.isEqual(modulesArray, injectedModules.sort())).to.eq(true);

  const filteredContent = filteredLines.join("\n");
  const startBlock = getStartBlock(modulesArray.filter(x => x > 0));

  expect(filteredContent).to.eq(getTemplate(null, startBlock));
}

export function forEachModules(cb: (modules: MobileCenterSdkModule, modulesNames: string) => void) {
  for (let modules: MobileCenterSdkModule = 0; modules < MobileCenterSdkModule.All; modules++) {

    const modulesArray = getMobileCenterSdkModulesArray(modules);
    const modulesNamesArray = modulesArray.map(x => MobileCenterSdkModule[x]);
    cb(modules, modulesNamesArray.join(","));
  }
}