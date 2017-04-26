import * as Path from "path";
import * as FS from "async-file";
import * as Helpers from "../../../../../util/misc/helpers";
import { TextWalkerC, TextWalkerCBag } from "../text-walker-c";
import { XcodeSdkIntegrationStep, XcodeIntegrationStepContext } from "../xcode-sdk-integration";
import { SdkIntegrationError } from "../../util/sdk-integration";
import { SearchAppDelegateFile } from "./search-app-delegate-file";

export class AddCocoapodsDependencies extends XcodeSdkIntegrationStep {
  protected nextStep = new SearchAppDelegateFile();
  protected async step() {
    this.context.podfilePath = this.context.podfilePath || Path.join(this.context.projectRootDirectory, "Podfile");

    let content = await this.getContent(this.context.podfilePath);
    content = this.addOrRemoveService(content, "pod 'MobileCenter/MobileCenterAnalytics'", this.context.analyticsEnabled);
    content = this.addOrRemoveService(content, "pod 'MobileCenter/MobileCenterCrashes'", this.context.crashesEnabled);
    content = this.addOrRemoveService(content, "pod 'MobileCenter/MobileCenterDistribute'", this.context.distributeEnabled);
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
    const serviceVersion = this.context.sdkVersion ? `${service}, '${this.context.sdkVersion}'` : service;
    let match: RegExpExecArray;
    const targetRegExp = new RegExp(`(target\\s+?:?['"]?${Helpers.escapeRegExp(this.context.projectName)}['"]?\\s+?do[\\s\\S]*?\r?\n)end`, "i");
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

    let serviceIndex = -1;
    const serviceRegex = new RegExp(` *?${service}.*\r?\n?`);
    match = serviceRegex.exec(content.substr(startIndex, endIndex - startIndex));
    if (match) {
      serviceIndex = startIndex + match.index;
    }

    if (!add) {
      return (~serviceIndex) ? Helpers.splice(content, serviceIndex, match[0].length, "") : content;
    }

    return serviceIndex >= 0
      ? Helpers.splice(content, serviceIndex, match[0].length, `  ${serviceVersion}\n`)
      : Helpers.splice(content, endIndex, 0, `  ${serviceVersion}\n`);
  }
}