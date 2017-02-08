import { Command, CommandArgs, CommandResult,
         help, success, longName, required, hasArg,
         failure, ErrorCodes } from "../../../util/commandline";
import { MobileCenterClient } from "../../../util/apis";
import { Messages } from "../lib/help-messages";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as AdmZip from "adm-zip";
import * as phttps from "../../../util/misc/promisfied-https";

@help(Messages.TestCloud.Commands.GenerateUITest)
export default class GenerateUITestCommand extends Command {
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

    if (this.platform.toLowerCase() != "ios" && this.platform.toLowerCase() != "android") {
      throw new Error("Valid values of argument --platform are 'ios' and 'android'");
    }
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {

    if (await pfs.exists(this.outputPath)) {
      let files = await pfs.readdir(this.outputPath);
      if (!(files.length === 0)) {
        return failure(ErrorCodes.Exception, this.outputPath + " exists and is not empty");
      }
    }

    let zipUrl = this.platform == "ios" 
      ? "https://s3-eu-west-1.amazonaws.com/xtc-frameworks/testcloud-project-templates/MobileCenter.UITest.iOS.zip" 
      : "https://s3-eu-west-1.amazonaws.com/xtc-frameworks/testcloud-project-templates/MobileCenter.UITest.Android.zip";

    let zipFilePath = (await pfs.openTempFile(null)).path;

    await phttps.getToFile(zipUrl, zipFilePath);

    let zip = new AdmZip(zipFilePath);
    zip.extractAllTo(this.outputPath);
    await pfs.unlink(zipFilePath);

    return success();
  }
}