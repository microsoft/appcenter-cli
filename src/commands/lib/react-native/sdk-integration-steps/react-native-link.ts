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

export class ReactNativeLink extends SdkIntegrationStepBase<ReactNativeIntegrationStepContext> {
  protected async step() {
    process.env.appSecretAndroid = this.context.appSecretAndroid;
    process.env.appSecretIos = this.context.appSecretIos;
    process.env.podfilePath = this.context.podfilePath;

    // TODO: Add the support to specify these parameters to mobile-center packages.
    //process.env.whenToSendCrashes = this.context.sendCrashesAuto ? "ALWAYS_SEND" : "ASK_JAVASCRIPT";
    //process.env.whenToEnableAnalytics = this.context.enableAnalyticsAuto ? "ALWAYS_SEND" : "ENABLE_IN_JS";

    if (this.context.analyticsEnabled) {
      await this.runReactNativeCli(["link", "mobile-center-analytics"]);
    }
    if (this.context.crashesEnabled) {
      await this.runReactNativeCli(["link", "mobile-center-crashes"]);
    }
    if (this.context.pushEnabled) {
      await this.runReactNativeCli(["link", "mobile-center-push"]);
    }
  }

  private async runReactNativeCli(args: string[]) {
    return new Promise((resolve, reject) => {
      const reactNativeProcess = Process.fork(this.resolveReactNativeCliPath(), args,
        { cwd: this.context.reactNativeProjectPath, stdio: "inherit"/*, execArgv: ["--debug=28486"]*/ } as any);
      reactNativeProcess.on('exit', (err: any) => {
        if (err > 0 && err < 10)
          return reject(err);
        resolve();
      });
    });
  }

  private resolveReactNativeCliPath(): string {
    var reactNativePath = this.resolveReactNativePath(this.context.reactNativeProjectPath);
    //if (!reactNativePath) { // Do we need to try to resolve react-native that's installed globally? 
    //  var npmRootG = Process.execSync("npm root -g", { encoding: 'utf8' }).trim();
    //  if (npmRootG) {
    //    reactNativePath = this.resolveReactNativePath(npmRootG);
    //  }
    //}
    if (!reactNativePath) throw new Error("Could not find 'react-native' package.");

    return Path.join(reactNativePath, "../../../local-cli/cli.js");
  }

  private resolveReactNativePath(cwd: string) {
    return Process.execSync("node -p \"try{ require.resolve('react-native');}catch(e){ ('').toString(); }\"", { cwd: cwd, encoding: 'utf8' }).trim();
  }
}