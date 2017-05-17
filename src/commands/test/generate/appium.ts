import { CommandArgs, help } from "../../../util/commandline";
import { GenerateCommand } from "../lib/generate-command";
import { Messages } from "../lib/help-messages";

@help(Messages.TestCloud.Commands.GenerateAppium)
export default class GenerateAppiumCommand extends GenerateCommand {
  
  constructor(args: CommandArgs) {
    super(args);
  }

  protected zipPathAndroid = "Appium/Android-1.0.zip";
  protected zipPathiOS = "Appium/iOS-1.0.zip";
}