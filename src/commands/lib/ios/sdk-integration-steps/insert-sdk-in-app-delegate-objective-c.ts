import * as Path from "path";
import * as FS from "async-file";
import * as Helpers from "../../../../util/misc/helpers";
import { CodeWalker, CodeBag } from "../../util/code-walker"
import { XcodeSdkIntegrationStep, XcodeIntegrationStepContext } from "../xcode-sdk-integration";
import { SdkIntegrationError } from "../../util/sdk-integration";

export class InsertSdkInAppDelegateObjectiveC extends XcodeSdkIntegrationStep {
  protected async step() {
    let appDelegateContent = await FS.readTextFile(this.context.appDelegateFile, "utf8");
    const bag = this.analyze(appDelegateContent);

    // Need to keep this insertion order to avoid index shifting.
    appDelegateContent = this.insertStart(bag, appDelegateContent);
    appDelegateContent = this.insertImports(bag, appDelegateContent);
    this.context.enqueueAction(() => FS.writeTextFile(this.context.appDelegateFile, appDelegateContent, "utf8"));
  }

  protected analyze(appDelegateContent: string): TextWalkerObjectiveCInjectBag {
    const textWalker = new CodeWalker(appDelegateContent, new TextWalkerObjectiveCInjectBag());
    textWalker.addTrap(bag =>
      bag.blockLevel === 0
      && !bag.isWithinImplementation
      && /[@#]import\s+?[\w"<>\/\.]+?;?\r?\n$/.test(textWalker.backpart),
      bag => {
        bag.endOfImportBlockIndex = textWalker.position;
      });
    textWalker.addTrap(bag =>
      bag.blockLevel === 0
      && textWalker.forepart.startsWith("@implementation"),
      bag => {
        const matches = /^@implementation\s+?\w+?\r?\n/.exec(textWalker.forepart);
        if (matches && matches[0]) {
          bag.isWithinImplementation = true;
          bag.wasWithinImplementation = true;
        }
      });
    textWalker.addTrap(
      bag => bag.blockLevel === 0
        && bag.isWithinImplementation
        && textWalker.currentChar === "@"
        && textWalker.forepart.startsWith("@end"),
      bag => bag.isWithinImplementation = false
    );
    textWalker.addTrap(
      bag =>
        bag.isWithinImplementation
        && bag.blockLevel === 1
        && bag.applicationFuncStartIndex < 0
        && textWalker.currentChar === '{',
      bag => {
        const matches = /-\s*?\(\s*?[\w\.]+?\s*?\)\s*application(?!\w)[\s\S]*?$/.exec(textWalker.backpart);
        if (matches) {
          bag.applicationFuncStartIndex = textWalker.position + 1;
          bag.isWithinApplicationMethod = true;
        }
      }
    );
    textWalker.addTrap(
      bag =>
        bag.blockLevel === 0
        && bag.isWithinApplicationMethod
        && textWalker.currentChar === "}",
      bag => {
        bag.applicationFuncEndIndex = textWalker.position;
        bag.isWithinApplicationMethod = false;
      }
    );
    textWalker.addTrap(
      bag =>
        bag.isWithinApplicationMethod
        && bag.msMobileCenterStartCallStartIndex < 0
        && /^\[\s*?MSMobileCenter\s+?start/.test(textWalker.forepart),
      bag => {
        let match = /^\[\s*MSMobileCenter\s+?start\s*:\s*@"([\s\S]+?)"\s+withServices[\s\S]+?\]\s*\]\s*;/.exec(textWalker.forepart);
        if (match) {
          bag.msMobileCenterStartCallStartIndex = textWalker.position;
          bag.msMobileCenterStartCallLength = match[0].length;
          match = /(\r?\n|) *?$/.exec(textWalker.backpart);
          if (match) {
            bag.msMobileCenterStartCallStartIndex -= match[0].length;
            bag.msMobileCenterStartCallLength += match[0].length;
          }
        }
      });
    return textWalker.walk();
  }

  private insertImports(bag: TextWalkerObjectiveCInjectBag, appDelegateContent: string): string {
    if (bag.endOfImportBlockIndex < 0) {
      bag.endOfImportBlockIndex = 0;
    }

    appDelegateContent = this.addOrRemoveImport(appDelegateContent, bag, "MobileCenter", true);
    appDelegateContent = this.addOrRemoveImport(appDelegateContent, bag, "MobileCenterAnalytics", this.context.analyticsEnabled);
    appDelegateContent = this.addOrRemoveImport(appDelegateContent, bag, "MobileCenterCrashes", this.context.crashesEnabled);
    appDelegateContent = this.addOrRemoveImport(appDelegateContent, bag, "MobileCenterDistribute", this.context.distributeEnabled);
    appDelegateContent = this.addOrRemoveImport(appDelegateContent, bag, "MobileCenterPush", this.context.pushEnabled);

    return appDelegateContent;
  }

  private addOrRemoveImport(appDelegateContent: string, bag: TextWalkerObjectiveCInjectBag, item: string, add: boolean) {
    const match = new RegExp(`@import +${item} *?;\r?\n`).exec(appDelegateContent.substr(0, bag.endOfImportBlockIndex));
    if (match && !add) {
      bag.endOfImportBlockIndex -= match[0].length;
      return Helpers.splice(appDelegateContent, match.index, match[0].length, "");
    } else if (!match && add) {
      const index = bag.endOfImportBlockIndex;
      const importText = `@import ${item};\n`;
      bag.endOfImportBlockIndex += importText.length;
      return Helpers.splice(appDelegateContent, index, 0, importText);
    } else {
      return appDelegateContent;
    }
  }

  private insertStart(bag: TextWalkerObjectiveCInjectBag, appDelegateContent: string): string {
    if (bag.applicationFuncStartIndex < 0) {
      throw new SdkIntegrationError("Function 'application' is not defined in AppDelegate");
    }

    if (bag.msMobileCenterStartCallStartIndex >= 0) {
      appDelegateContent = Helpers.splice(appDelegateContent, bag.msMobileCenterStartCallStartIndex, bag.msMobileCenterStartCallLength, "");
    }

    const services: string[] = [];
    if (this.context.analyticsEnabled) {
      services.push("[MSAnalytics class]")
    }

    if (this.context.crashesEnabled) {
      services.push("[MSCrashes class]")
    }

    if (this.context.distributeEnabled) {
      services.push("[MSDistribute class]");
    }

    if (this.context.pushEnabled) {
      services.push("[MSPush class]");
    }

    const start = `[MSMobileCenter start:@"${this.context.appSecret}" withServices:@[${services.join(", ")}]];`
    const startIndex = bag.msMobileCenterStartCallStartIndex >= 0 ? bag.msMobileCenterStartCallStartIndex : bag.applicationFuncStartIndex;
    appDelegateContent = Helpers.splice(appDelegateContent, startIndex, 0, `\n    ${start}`);
    return appDelegateContent;
  }
}

class TextWalkerObjectiveCInjectBag extends CodeBag {
  isWithinImplementation: boolean = false;
  wasWithinImplementation: boolean = false;
  endOfImportBlockIndex: number = -1;
  applicationFuncStartIndex: number = -1;
  isWithinApplicationMethod: boolean = false;
  applicationFuncEndIndex: number = -1;
  msMobileCenterStartCallStartIndex: number = -1;
  msMobileCenterStartCallLength: number = -1;
}