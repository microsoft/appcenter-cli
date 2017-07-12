import * as Path from "path";
import * as Semver from "semver";
import * as FS from "async-file";
import * as Helpers from "../../../../util/misc/helpers";
import { XcodeSdkIntegrationStep, XcodeIntegrationStepContext } from "../xcode-sdk-integration";
import { SdkIntegrationError, SdkIntegrationStepBase } from "../../util/sdk-integration";

export class AddCocoapodsDependencies<T extends XcodeIntegrationStepContext> extends SdkIntegrationStepBase<T> {
  protected async step() {
    this.context.podfilePath = this.context.podfilePath || Path.join(this.context.projectRootDirectory, "Podfile");
    let content = await this.getContent(this.context.podfilePath);
    content = this.addOrRemoveServices(content);
    this.context.enqueueAction(() => FS.writeTextFile(this.context.podfilePath, content, "utf8"));
  }

  protected addOrRemoveServices(content: string): string {
    content = this.addOrRemoveService(content, `MobileCenter`, false, this.context.sdkVersion);

 	  const subSpecPrefix = (Semver.valid(this.context.sdkVersion) &&
      Semver.gte(this.context.sdkVersion, "0.10.0", true)) ? "" : "MobileCenter";

    content = this.addOrRemoveService(content, `MobileCenter/${subSpecPrefix}Analytics`, this.context.analyticsEnabled, this.context.sdkVersion);
    content = this.addOrRemoveService(content, `MobileCenter/${subSpecPrefix}hes`, this.context.crashesEnabled, this.context.sdkVersion);
    content = this.addOrRemoveService(content, `MobileCenter/${subSpecPrefix}Distribute`, this.context.distributeEnabled, this.context.sdkVersion);
    content = this.addOrRemoveService(content, `MobileCenter/${subSpecPrefix}Push`, this.context.pushEnabled, this.context.sdkVersion);
    return content;
  }

  private async getContent(podFile: string): Promise<string> {
    if (!await FS.exists(podFile)) {
      return AddCocoapodsDependencies.getPodInitContent(this.context.projectName);
    } else {
      return FS.readTextFile(podFile, "utf8");
    }
  }

  protected addOrRemoveService(content: string, service: string, add: boolean, sdkVersion: string) {
    const quote = `['\u2018\u2019"]`;
    const serviceVersion = `pod '${service}'` + (sdkVersion ? `, '${sdkVersion}'` : "");
    let match: RegExpExecArray;
    const targetRegExp = new RegExp(`(target\\s+?:?${quote}?${Helpers.escapeRegExp(this.context.projectName)}${quote}?\\s+?do[\\s\\S]*?\r?\n)\\s*?end`, "i");
    match = targetRegExp.exec(content);
    let startIndex: number;
    let endIndex: number;
    if (match) {
      startIndex = match.index;
      endIndex = match.index + match[1].length;
    } else {
      startIndex = content.length;
      content += `\ntarget '${this.context.projectName}' do\n  use_frameworks!\n`;
      endIndex = content.length;
      content += "end";
    }

    const serviceRegex = new RegExp(`(\r?\n) *?pod +${quote}${service}${quote}.*\r?\n?`);
    match = serviceRegex.exec(content.substr(startIndex, endIndex - startIndex));
    if (match) {
      const matchIndex = match.index + match[1].length;
      const matchLength = match[0].length - match[1].length;
      const serviceIndex = startIndex + matchIndex;
      if (add) {
        return Helpers.splice(content, serviceIndex, matchLength, `  ${serviceVersion}\n`)
      } else {
        return Helpers.splice(content, serviceIndex, matchLength, "");
      }
    }

    if (add) {
      return Helpers.splice(content, endIndex, 0, `  ${serviceVersion}\n`);
    } else {
      return content;
    }
  }

  public static getPodInitContent(projectName: string, platform: string = `ios, '9.0'`) {
    return `# Uncomment the next line to define a global platform for your project
# platform :${platform}

target '${projectName}' do
  # Uncomment the next line if you're using Swift or would like to use dynamic frameworks
  # use_frameworks!

  # Pods for ${projectName}

end`;
  }
}