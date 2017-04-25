import * as Path from "path";
import * as FS from "async-file";
import * as Glob from "glob";
import * as Helpers from "../../../../../util/misc/helpers";
import { TextWalkerC, TextWalkerCBag } from "../text-walker-c";
import { XcodeSdkIntegrationStep, XcodeIntegrationStepContext } from "../xcode-sdk-integration";
import { SdkIntegrationError } from "../../util/sdk-integration";
import { AddCocoapodsDependencies } from "./add-cocoapods-dependencies";

export class SearchProjectPaths extends XcodeSdkIntegrationStep {
  protected nextStep = new AddCocoapodsDependencies();
  protected step() {
    const xcodeProjectDirectory = this.findXcodeProjectDirectory();
    this.context.projectRootDirectory = Path.join(xcodeProjectDirectory, "../");
    this.context.projectName = Path.basename(xcodeProjectDirectory, Path.extname(xcodeProjectDirectory));
  }

  private findXcodeProjectDirectory() {
    const xcworkspacedataFiles = Glob.sync("**/*.xcworkspace/*.xcworkspacedata", { cwd: this.context.projectPath, ignore: "**/*.xcodeproj/**", absolute: true } as any);
    const pbxprojFiles = Glob.sync("**/*.xcodeproj/*.pbxproj", { cwd: this.context.projectPath, ignore: "**/Pods.xcodeproj/*.pbxproj", absolute: true } as any);
    const files = xcworkspacedataFiles.concat(pbxprojFiles).sort((a, b) => a.split("/").length - b.split("/").length);
    if (!files.length) {
      throw new SdkIntegrationError("There are no projects");
    }

    return Path.join(files[0], "../");
  }
}