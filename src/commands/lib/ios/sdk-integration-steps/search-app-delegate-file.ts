import * as Path from "path";
import * as FS from "async-file";
import * as Glob from "glob";
import * as Helpers from "../../../../util/misc/helpers";
import { XcodeSdkIntegrationStep, XcodeIntegrationStepContext } from "../xcode-sdk-integration";
import { SdkIntegrationError } from "../../util/sdk-integration";

export class SearchAppDelegateFile extends XcodeSdkIntegrationStep {
  protected async step() {
    const swiftAppDelegate = await this.searchSwiftAppDelegate();
    const objectiveCAppDelegate = await this.searchObjectiveCAppDelegate();
    const path = [swiftAppDelegate, objectiveCAppDelegate].filter(x => !!x).sort((a, b) => a.split("\\").length - b.split("\\").length)[0];

    if (!path) {
      throw new SdkIntegrationError("There is no AppDelegate file");
    }

    this.context.appDelegateFile = path;
  }

  private async searchInFiles(ext: string, isAppDelegateFile: (path: string) => Promise<boolean>): Promise<string> {
    const files = Glob.sync("**/*." + ext, { cwd: this.context.projectRootDirectory, absolute: true } as any);
    for (const file of files) {
      if (await isAppDelegateFile(file)) {
        return Path.normalize(file);
      }
    }
  }

  private searchSwiftAppDelegate(): Promise<string> {
    return this.searchInFiles("swift", path => this.isSwiftAppDelegateFile(path));
  }

  private async isSwiftAppDelegateFile(path: string): Promise<boolean> {
    const content = await FS.readTextFile(path, "utf8");
    return /@UIApplicationMain[\s\w@]+?class\s+?[\w]+\s*?:/.test(content);
  }

  private async searchObjectiveCAppDelegate(): Promise<string> {
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
      return Path.normalize(srcPath);
    }

    return this.searchInFiles("h", path => this.isObjectiveCAppDelegateFile(path, implementationName));
  }

  private async isObjectiveCAppDelegateFile(path: string, implementationName: string): Promise<boolean> {
    const content = await FS.readTextFile(path, "utf8");
    return new RegExp(`\\s+@implementation ${implementationName}\\s+`).test(content);
  }
}