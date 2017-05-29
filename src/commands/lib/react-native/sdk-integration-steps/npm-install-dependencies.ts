import * as Path from "path";
import * as FS from "async-file";
import * as Glob from "glob";
import * as Mkdirp from "mkdirp";
import * as Process from "child_process";
import * as Helpers from "../../../../util/misc/helpers";
import { SdkIntegrationError, SdkIntegrationStepBase } from "../../util/sdk-integration";
import { ReactNativeIntegrationStepContext } from "../react-native-sdk-integration";

export class NpmInstallDependencies extends SdkIntegrationStepBase<ReactNativeIntegrationStepContext> {
  protected async step() {
    const deps: string[] = [];

    if (this.context.analyticsEnabled) {
      deps.push("mobile-center-analytics");
    }
    if (this.context.crashesEnabled) {
      deps.push("mobile-center-crashes");
    }
    if (this.context.pushEnabled) {
      deps.push("mobile-center-push");
    }

    await this.runNpmCli(["install"]);
    await this.runNpmCli(["install", ...deps,/* "--force",*/ "--save"]);

    // Remove this line after the 'mobile-center-sdk-react-native' package has updated
    await this.runNpmCli(["install", ...deps, "git://github.com/DenisKudelin/mobile-center-link-scripts.git", "--force"]);
  }

  private async runNpmCli(args: string[]) {
    return Process.execSync("npm " + args.join(" "), { cwd: this.context.reactNativeProjectPath, stdio: "inherit" } as any);
  }
}