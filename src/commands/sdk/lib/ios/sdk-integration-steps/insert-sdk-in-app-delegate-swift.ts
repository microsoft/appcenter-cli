import * as Path from "path";
import * as FS from "async-file";
import * as Helpers from "../../../../../util/misc/helpers";
import { TextWalkerC, TextWalkerCBag } from "../text-walker-c";
import { XcodeSdkIntegrationStep, XcodeIntegrationStepContext } from "../xcode-sdk-integration";
import { SdkIntegrationError } from "../../util/sdk-integration";

export class InsertSdkInAppDelegateSwift extends XcodeSdkIntegrationStep {
  protected async step() {
    let appDelegateContent = await FS.readTextFile(this.context.appDelegateFile, "utf8");
    const bag = this.analyze(appDelegateContent);

    // Need to keep this insertion order to avoid index shifting.
    appDelegateContent = this.insertStart(bag, appDelegateContent);
    appDelegateContent = this.insertImports(bag, appDelegateContent);
    this.context.enqueueAction(() => FS.writeTextFile(this.context.appDelegateFile, appDelegateContent, "utf8"));
  }

  private analyze(appDelegateContent: string): TextWalkerSwiftInjectBag {
    const textWalker = new TextWalkerC(appDelegateContent, new TextWalkerSwiftInjectBag());
    textWalker.addTrap(bag => bag.significant
      && bag.blockLevel === 0
      && !bag.wasWithinClass
      && /import\s+?[\w\.]+?\r?\n$/.test(textWalker.backpart),
      bag => {
        bag.endOfImportBlockIndex = textWalker.position;
      });
    textWalker.addTrap(bag =>
      bag.significant
      && bag.blockLevel === 1
      && textWalker.currentChar === "{",
      bag => {
        const matches = /\s*([a-z]+?\s+?|)(class|extension)\s+?\w+?(?!\w).*?$/.exec(textWalker.backpart);
        if (matches && matches[0]) {
          bag.isWithinClass = true;
          bag.wasWithinClass = true;
        }
      });
    textWalker.addTrap(
      bag =>
        bag.significant &&
        bag.blockLevel === 0 &&
        bag.isWithinClass &&
        textWalker.currentChar === "}",
      bag => bag.isWithinClass = false
    );
    textWalker.addTrap(
      bag =>
        bag.significant &&
        bag.isWithinClass &&
        bag.blockLevel === 2 &&
        textWalker.currentChar === '{',
      bag => {
        const matches = /^\s*([a-z]+?\s+?|)func\s+?application\s*?\(/m.exec(textWalker.backpart)
        if (matches && bag.applicationFuncStartIndex < 0) {
          bag.isWithinMethod = true;
          bag.applicationFuncStartIndex = textWalker.position + 1;
          bag.isWithinApplicationMethod = true;
        }
      }
    );
    textWalker.addTrap(
      bag =>
        bag.significant &&
        bag.blockLevel === 1 &&
        bag.isWithinMethod &&
        textWalker.currentChar === "}",
      bag => {
        bag.isWithinMethod = false;
        if (bag.isWithinApplicationMethod) {
          bag.applicationFuncEndIndex = textWalker.position;
          bag.isWithinApplicationMethod = false;
        }
      }
    );
    textWalker.addTrap(
      bag => bag.significant
        && bag.isWithinApplicationMethod
        && bag.msMobileCenterStartCallStartIndex < 0
        && textWalker.forepart.startsWith("MSMobileCenter.start"),
      bag => {
        let match = /^MSMobileCenter.start\s*?\(".+?",\s*?withServices: .+?\)/.exec(textWalker.forepart);
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

  private insertImports(bag: TextWalkerSwiftInjectBag, appDelegateContent: string): string {
    if (bag.endOfImportBlockIndex < 0) {
      bag.endOfImportBlockIndex = 0;
    }

    appDelegateContent = this.addOrRemoveImport(appDelegateContent, bag.endOfImportBlockIndex, "MobileCenter", true);
    appDelegateContent = this.addOrRemoveImport(appDelegateContent, bag.endOfImportBlockIndex, "MobileCenterAnalytics", this.context.analyticsEnabled);
    appDelegateContent = this.addOrRemoveImport(appDelegateContent, bag.endOfImportBlockIndex, "MobileCenterCrashes", this.context.crashesEnabled);
    appDelegateContent = this.addOrRemoveImport(appDelegateContent, bag.endOfImportBlockIndex, "MobileCenterDistribute", this.context.distributeEnabled);

    return appDelegateContent;
  }

  private addOrRemoveImport(appDelegateContent: string, index: number, item: string, add: boolean) {
    const match = new RegExp(`import +${item}\r?\n`).exec(appDelegateContent.substr(0, index));
    if (match && !add) {
      return Helpers.splice(appDelegateContent, match.index, match[0].length, "");
    } else if (!match && add) {
      return Helpers.splice(appDelegateContent, index, 0, `import ${item}\n`);
    } else {
      return appDelegateContent;
    }
  }

  private insertStart(bag: TextWalkerSwiftInjectBag, appDelegateContent: string): string {
    if (bag.applicationFuncStartIndex < 0) {
      throw new SdkIntegrationError("Function 'application' is not defined in AppDelegate");
    }

    if (bag.msMobileCenterStartCallStartIndex >= 0) {
      appDelegateContent = Helpers.splice(appDelegateContent, bag.msMobileCenterStartCallStartIndex, bag.msMobileCenterStartCallLength, "");
    }

    const services: string[] = [];
    if (this.context.analyticsEnabled) {
      services.push("MSAnalytics.self");
    }

    if (this.context.crashesEnabled) {
      services.push("MSCrashes.self");
    }

    if (this.context.distributeEnabled) {
      services.push("MSDistribute.self");
    }

    const start = `MSMobileCenter.start("${this.context.appSecret}", withServices: [${services.join(", ")}])`;
    appDelegateContent = Helpers.splice(appDelegateContent, bag.applicationFuncStartIndex, 0, `\n        ${start}`);
    return appDelegateContent;
  }
}

class TextWalkerSwiftInjectBag extends TextWalkerCBag {
  isWithinClass: boolean = false;
  wasWithinClass: boolean = false;
  isWithinMethod: boolean = false;
  isWithinApplicationMethod: boolean = false;
  applicationFuncStartIndex: number = -1;
  endOfImportBlockIndex: number = -1;
  applicationFuncEndIndex: number = -1;
  msMobileCenterStartCallStartIndex: number = -1;
  msMobileCenterStartCallLength: number = -1;
}