import { Command, CommandArgs, CommandResult,
         help, success, longName, required, hasArg,
         failure, ErrorCodes } from "../../../util/commandline";
import { Messages } from "../lib/help-messages";
import * as pfs from "../../../util/misc/promisfied-fs";

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
    return;
  }

  protected abstract templatePathAndroid: string;
  protected abstract templatePathiOS: string;

  protected abstract async processTemplate(): Promise<void>;

  protected isIOS(): boolean {
    return (this.platform.toLowerCase() === "ios");
  }

  protected isAndroid(): boolean {
    return (this.platform.toLowerCase() === "android");
  }

  protected async copyTemplates(): Promise<void> {
    const templatePath = this.isIOS() ? this.templatePathiOS : this.templatePathAndroid;
    await pfs.cpDir(templatePath, this.outputPath);
  }

  public async runNoClient(): Promise<CommandResult> {
    if (!(this.isIOS() || this.isAndroid())) {
      throw new Error("Valid values of argument --platform are 'ios' and 'android'");
    }

    await this.validateOptions();

    if (await pfs.exists(this.outputPath)) {
      const files = await pfs.readdir(this.outputPath);
      if (!(files.length === 0)) {
        return failure(ErrorCodes.Exception, this.outputPath + " exists and is not empty");
      }
    }

    await this.copyTemplates();
    await this.processTemplate();

    return success();
  }
}
