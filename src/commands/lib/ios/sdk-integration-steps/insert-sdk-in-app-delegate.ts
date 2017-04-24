import * as Path from "path";
import * as FS from "async-file";
import * as Helpers from "../../../../util/misc/helpers";
import { CodeWalker, CodeBag } from "../../util/code-walker"
import { XcodeSdkIntegrationStep, XcodeIntegrationStepContext } from "../xcode-sdk-integration";
import { SdkIntegrationError } from "../../util/sdk-integration";
import { InsertSdkInAppDelegateObjectiveC } from "./insert-sdk-in-app-delegate-objective-c";
import { InsertSdkInAppDelegateSwift } from "./insert-sdk-in-app-delegate-swift";

export class InsertSdkInAppDelegate extends XcodeSdkIntegrationStep {
  protected async step() {
    if (this.context.appDelegateFile.endsWith(".swift")) {
      await new InsertSdkInAppDelegateSwift().run(this.context);
    } else {
      await new InsertSdkInAppDelegateObjectiveC().run(this.context);
    }
  }
}