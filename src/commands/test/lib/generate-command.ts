const fetch = require('node-fetch');
import * as fs from 'fs';
import { Command, CommandArgs, CommandResult,
         help, success, longName, required, hasArg,
         failure, ErrorCodes } from "../../../util/commandline";
import { MobileCenterClient } from "../../../util/apis";
import { Messages } from "../lib/help-messages";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as JsZip from "jszip";
import * as JsZipHelper from "../../../util/misc/jszip-helper";

export abstract class GenerateCommand extends Command {
  @help(Messages.TestCloud.Arguments.AppPlatform)
  @longName("platform")
  @required
  @hasArg
  platform: string;
  
  @help(Messages.TestCloud.Arguments.GenerateOutputPath)
  @longName("output-path")
  @required
  @hasArg
  outputPath: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  // Override this if you need to validate options
  protected async validateOptions(): Promise<void> {
  }

  protected abstract zipPathAndroid: string;
  protected abstract zipPathiOS: string;

  protected isIOS(): boolean {
    return (this.platform.toLowerCase() == "ios");
  }

  protected isAndroid(): boolean {
    return (this.platform.toLowerCase() == "android");
  }

  public async runNoClient(): Promise<CommandResult> {
    if (!(this.isIOS() || this.isAndroid())) {
      throw new Error("Valid values of argument --platform are 'ios' and 'android'");
    }

    await this.validateOptions();
    
    if (await pfs.exists(this.outputPath)) {
      let files = await pfs.readdir(this.outputPath);
      if (!(files.length === 0)) {
        return failure(ErrorCodes.Exception, this.outputPath + " exists and is not empty");
      }
    }

    let zipUrl = await this.zipUrl();
    let zipResponse = await fetch(zipUrl);
    let zip = await new JsZip().loadAsync(await zipResponse.buffer());
    await JsZipHelper.unpackZipToPath(this.outputPath, zip);

    return success();
  }

  private async zipUrl(): Promise<string>
  {
    let url = "https://s3-eu-west-1.amazonaws.com/xtc-frameworks/testcloud-project-templates/";

    return url += this.isIOS() ? this.zipPathiOS : this.zipPathAndroid;
  }
}