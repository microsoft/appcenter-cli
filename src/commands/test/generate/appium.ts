import { CommandArgs, help } from "../../../util/commandline";
import { GenerateCommand } from "../lib/generate-command";
import { Messages } from "../lib/help-messages";
import * as path from "path";

@help(Messages.TestCloud.Commands.GenerateAppium)
export default class GenerateAppiumCommand extends GenerateCommand {

  constructor(args: CommandArgs) {
    super(args);
  }

  protected templatePathAndroid = path.join(__dirname, "../lib/templates/appium/android");
  protected templatePathiOS = path.join(__dirname, "../lib/templates/appium/ios");

  protected async processTemplate(): Promise<void> {
    return;
  }
}
