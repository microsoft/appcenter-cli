import * as Path from "path";
import * as FS from "async-file";
import * as Glob from "glob";
import * as Helpers from "../../../../../util/misc/helpers";
import { TextWalkerC, TextWalkerCBag } from "../text-walker-c";
import { XcodeSdkIntegrationStep, XcodeIntegrationStepContext } from "../xcode-sdk-integration";
import { SdkIntegrationError } from "../../util/sdk-integration";
import { InsertSdkInAppDelegateObjectiveC } from "./insert-sdk-in-app-delegate-objective-c";
import { InsertSdkInAppDelegateSwift } from "./insert-sdk-in-app-delegate-swift";

export class SearchAppDelegateFile extends XcodeSdkIntegrationStep {
  protected async step() {
    let path = await this.searchSwiftAppDelegate();
    if (!path) {
      path = await this.searchObjectiveCAppDelegate();
    }

    if (!path) {
      throw new SdkIntegrationError("There is no AppDelegate file");
    }

    this.context.appDelegateFile = path;
    if (this.context.appDelegateFile.endsWith(".swift")) {
      this.nextStep = new InsertSdkInAppDelegateSwift();
    } else {
      this.nextStep = new InsertSdkInAppDelegateObjectiveC();
    }
  }

  private async searchInFiles(ext: string, isAppDelegateFile: (path: string) => Promise<boolean>): Promise<string> {
    const files = Glob.sync("**/*." + ext, { cwd: this.context.projectRootDirectory, absolute: true } as any);
    for (const file of files) {
      if (await isAppDelegateFile(file)) {
        return file;
      }
    }
  }

  private searchSwiftAppDelegate() {
    return this.searchInFiles("swift", path => this.isSwiftAppDelegateFile(path));
  }

  private async isSwiftAppDelegateFile(path: string): Promise<boolean> {
    const content = await FS.readTextFile(path, "utf8");
    return /@UIApplicationMain[\s\w@]+?class\s+?[\w]+\s*?:/.test(content);
  }

  private async searchObjectiveCAppDelegate() {
    let implementationName: string;
    const path = await this.searchInFiles("h", async path => {
      const content = await FS.readTextFile(path, "utf8");
      const match = /@interface\s+?(\w+)\s*?:\s*?(NSObject|UIResponder)\s*\<\s*?UIApplicationDelegate/.exec(content);
      if (match) {
        implementationName = match[1];
        return true;
      } else {
        return false;
      }
    });

    if (!path) {
      return null;
    }

    const srcPath = Path.join(path, "../", Path.basename(path, Path.extname(path))) + ".m";
    if (await this.isObjectiveCAppDelegateFile(srcPath, implementationName)) {
      return srcPath;
    }

    return this.searchInFiles("h", path => this.isObjectiveCAppDelegateFile(path, implementationName));
  }

  private async isObjectiveCAppDelegateFile(path: string, implementationName: string): Promise<boolean> {
    const content = await FS.readTextFile(path, "utf8");
    return new RegExp(`\\s+@implementation ${implementationName}\\s+`).test(content);
  }
}