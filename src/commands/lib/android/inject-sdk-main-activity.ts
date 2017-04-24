import { ActivityBag, ActivityWalker } from "./activity-walker";

import { MobileCenterSdkModule } from "../models/mobilecenter-sdk-module";

export default function injectSdkMainActivity(code: string, activityName: string, appSecret: string, sdkModules: MobileCenterSdkModule): string {
  let result: string;
  let info = analyzeCode(code, activityName);

  if (info.injectStartSdkAt == undefined)
    throw new Error("Cannot integrate Mobile Center SDK into the main activity file.");
  info.indent = info.indent || "    ";
  info.injectImportsAt = info.injectImportsAt || 0;

  let importStatements: string[] = [];
  let sdkModulesList: string[] = [];
  if (sdkModules)
    importStatements.push("import com.microsoft.azure.mobile.MobileCenter;");
  if (sdkModules & MobileCenterSdkModule.Analytics) {
    importStatements.push("import com.microsoft.azure.mobile.analytics.Analytics;");
    sdkModulesList.push("Analytics.class");
  }
  if (sdkModules & MobileCenterSdkModule.Crashes) {
    importStatements.push("import com.microsoft.azure.mobile.crashes.Crashes;");
    sdkModulesList.push("Crashes.class");
  }
  if (sdkModules & MobileCenterSdkModule.Distribute) {
    importStatements.push("import com.microsoft.azure.mobile.distribute.Distribute;");
    sdkModulesList.push("Distribute.class");
  }
  if (sdkModules & MobileCenterSdkModule.Push) {
    importStatements.push("import com.microsoft.azure.mobile.push.Push;");
    sdkModulesList.push("Push.class");
  }

  let startSdkStatements: string[] = [];
  startSdkStatements.push(`MobileCenter.start(getApplication(), "${appSecret}",`);
  startSdkStatements.push(`        ${sdkModulesList.join(", ")});`);

  result = code.substr(0, info.injectImportsAt);
  importStatements.forEach(x => result += "\r\n" + x);
  result += code.substr(info.injectImportsAt, info.injectStartSdkAt - info.injectImportsAt).replace(/^\s*/, "\r\n\r\n");
  startSdkStatements.forEach(x => result += "\r\n" + info.indent + info.indent + x);
  result += code.substr(info.injectStartSdkAt).replace(/^[ \t]*}/, "\r\n" + info.indent + "}");

  return result;
}

function analyzeCode(code: string, activityName: string): InjectBag {

  let injectBag = new InjectBag();
  let walker = new ActivityWalker<InjectBag>(code, injectBag, activityName);

  // import statements
  walker.addTrap(
    bag =>
      !bag.blockLevel &&
      walker.forepart.startsWith("import"),
    bag => {
      let matches = walker.forepart.match(/^import\s+[^]+?;/);
      if (matches && matches[0]) {
        bag.injectImportsAt = walker.position + matches[0].length;
      }
    }
  );

  // Start SDK position
  walker.addTrap(
    bag =>
      bag.isWithinMethod,
    bag => {
      bag.injectStartSdkAt = walker.position + 1;
      walker.stop();
    }
  );

  return walker.walk();
}

class InjectBag extends ActivityBag {
  indent: string;
  injectImportsAt: number;
  injectStartSdkAt: number;
}