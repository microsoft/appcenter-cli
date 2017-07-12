import * as Path from "path";
import * as FS from "async-file";
import * as Glob from "glob";
import * as Mkdirp from "mkdirp";
import * as Process from "child_process";
import * as Helpers from "../../../../util/misc/helpers";
import { SdkIntegrationError, SdkIntegrationStepBase } from "../../util/sdk-integration";
import { SearchProjectPaths } from "../../ios/sdk-integration-steps/search-project-paths";
import { AddCocoapodsDependencies } from "../../ios/sdk-integration-steps/add-cocoapods-dependencies";
import { ReactNativeIntegrationStepContext } from "../react-native-sdk-integration";

export class InitPodfile extends SdkIntegrationStepBase<ReactNativeIntegrationStepContext> {
  protected async step() {
    this.context.podfilePath = await this.getPodfilePath();
  }

  private async getPodfilePath(): Promise<string> {
    if (process.platform == 'darwin') return "";

    const xcodeProjectOrWorkspacePath = this.context.xcodeProjectOrWorkspacePath || SearchProjectPaths.findXcodeProjectDirectory(this.context.reactNativeProjectPath);
    const projectName = Path.basename(xcodeProjectOrWorkspacePath, Path.extname(xcodeProjectOrWorkspacePath));
    const podfilePath = this.context.podfilePath || Path.join(xcodeProjectOrWorkspacePath, "../Podfile");

    if (!await FS.exists(podfilePath)) {
      const content = AddCocoapodsDependencies.getPodInitContent(projectName);
      await FS.writeTextFile(podfilePath, content, "utf8");
    }

    return podfilePath;
  }
}