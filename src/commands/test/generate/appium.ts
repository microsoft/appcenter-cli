import { Command, CommandArgs, CommandResult,
         help, success, longName, required, hasArg,
         failure, ErrorCodes } from "../../../util/commandline";
import { GenerateCommand } from "../lib/generate-command";
import { MobileCenterClient } from "../../../util/apis";
import { Messages } from "../lib/help-messages";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as phttps from "../../../util/misc/promisfied-https";

@help(Messages.TestCloud.Commands.GenerateAppium)
export default class GenerateAppiumCommand extends GenerateCommand {
  
  constructor(args: CommandArgs) {
    super(args);
  }

  protected zipPathAndroid = "Appium/Android-1.0.zip";
  protected zipPathiOS = "Appium/iOS-1.0.zip";
}