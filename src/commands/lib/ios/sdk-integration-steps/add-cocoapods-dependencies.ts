import * as Path from "path";
import * as Semver from "semver";
import * as FS from "async-file";
import * as Helpers from "../../../../util/misc/helpers";
import { XcodeSdkIntegrationStep, XcodeIntegrationStepContext } from "../xcode-sdk-integration";
import { SdkIntegrationError } from "../../util/sdk-integration";

export class AddCocoapodsDependencies extends XcodeSdkIntegrationStep {
  protected async step() {
    this.context.podfilePath = this.context.podfilePath || Path.join(this.context.projectRootDirectory, "Podfile");

    let content = await this.getContent(this.context.podfilePath);
    content = this.addOrRemoveService(content, `MobileCenter`, false);

    const subSpecPrefix = (Semver.valid(this.context.sdkVersion) &&
      Semver.gte(this.context.sdkVersion, "0.10.0", true)) ? "" : "MobileCenter";

    content = this.addOrRemoveService(content, `MobileCenter/${subSpecPrefix}Analytics`, this.context.analyticsEnabled);
    content = this.addOrRemoveService(content, `MobileCenter/${subSpecPrefix}Crashes`, this.context.crashesEnabled);
    content = this.addOrRemoveService(content, `MobileCenter/${subSpecPrefix}Distribute`, this.context.distributeEnabled);
    content = this.addOrRemoveService(content, `MobileCenter/${subSpecPrefix}Push`, this.context.pushEnabled);

    this.context.enqueueAction(() => FS.writeTextFile(this.context.podfilePath, content, "utf8"));
  }

  private async getContent(podFile: string): Promise<string> {
    if (!await FS.exists(podFile)) {
      return `platform :ios, '8.0'`;
    } else {
      return FS.readTextFile(podFile, "utf8");
    }
  }

  private addOrRemoveService(content: string, service: string, add: boolean) {
    const quote = `['\u2018\u2019"]`;
    const serviceVersion = `pod '${service}'` + (this.context.sdkVersion ? `, '${this.context.sdkVersion}'` : "");
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
}
