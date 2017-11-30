import { Command, CommandArgs, CommandResult,
         help, success, longName, required, hasArg,
         failure, ErrorCodes } from "../../../util/commandline";
import { GenerateCommand } from "../lib/generate-command";
import { AppCenterClient } from "../../../util/apis";
import { Messages } from "../lib/help-messages";
import * as pfs from "../../../util/misc/promisfied-fs";
import * as phttps from "../../../util/misc/promisfied-https";

@help(Messages.TestCloud.Commands.GenerateUITest)
export default class GenerateUITestCommand extends GenerateCommand {

  constructor(args: CommandArgs) {
    super(args);
  }

  protected zipPathAndroid = "UITest/Android-1.1.zip";
  protected zipPathiOS = "UITest/iOS-1.1.zip";
}