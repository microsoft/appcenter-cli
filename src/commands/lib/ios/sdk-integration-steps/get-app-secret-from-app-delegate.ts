import * as Path from "path";
import * as FS from "async-file";
import * as Helpers from "../../../../util/misc/helpers";
import { XcodeSdkIntegrationStep, XcodeIntegrationStepContext } from "../xcode-sdk-integration";
import { SdkIntegrationError } from "../../util/sdk-integration";
import { InsertSdkInAppDelegateObjectiveC } from "./insert-sdk-in-app-delegate-objective-c";
import { InsertSdkInAppDelegateSwift } from "./insert-sdk-in-app-delegate-swift";

export class GetAppSecretFromAppDelegate extends XcodeSdkIntegrationStep {
  protected async step() {
    if (this.context.appDelegateFile.endsWith(".swift")) {
      await new GetAppSecretFromAppDelegateSwift().run(this.context);
    } else {
      await new GetAppSecretFromAppDelegateObjectiveC().run(this.context);
    }
  }
}

class GetAppSecretFromAppDelegateSwift extends InsertSdkInAppDelegateSwift {
  protected async step() {
    const appDelegateContent = await FS.readTextFile(this.context.appDelegateFile, "utf8");
    const bag = this.analyze(appDelegateContent);
    if (bag.msMobileCenterStartCallStartIndex < 0 || bag.msMobileCenterStartCallLength <= 0) {
      return;
    }

    const msMobileCenterStart = appDelegateContent.substr(bag.msMobileCenterStartCallStartIndex, bag.msMobileCenterStartCallLength).trim();
    const match = /^MSMobileCenter.start\s*?\("(.+?)",\s*?withServices:\s*?\[[\s\S]+?\]\s*?\)/.exec(msMobileCenterStart);
    this.context.appSecret = match[1];
  }
}

class GetAppSecretFromAppDelegateObjectiveC extends InsertSdkInAppDelegateObjectiveC {
  protected async step() {
    const appDelegateContent = await FS.readTextFile(this.context.appDelegateFile, "utf8");
    const bag = this.analyze(appDelegateContent);
    if (bag.msMobileCenterStartCallStartIndex < 0 || bag.msMobileCenterStartCallLength <= 0) {
      return;
    }

    const msMobileCenterStart = appDelegateContent.substr(bag.msMobileCenterStartCallStartIndex, bag.msMobileCenterStartCallLength).trim();
    const match = /^\[\s*MSMobileCenter\s+?start\s*:\s*@"([\s\S]+?)"\s+withServices[\s\S]+?\]\s*\]\s*;/.exec(msMobileCenterStart);
    this.context.appSecret = match[1];
  }
}