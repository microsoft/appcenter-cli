import { CommandArgs, CommandResult, AppCommand } from "../../../../util/commandline";
import { AppCenterClient } from "../../../../util/apis";
import { out } from "../../../../util/interaction";
import RunXCUITestCommand from "../../run/xcuitest";

export default class RunXCUIWizardTestCommand extends AppCommand {

  private _args: CommandArgs;
  constructor(args: CommandArgs, interactiveArgs: string[]) {
    super(args);
    this._args = args;
    this._args.args.push(...interactiveArgs);
  }

  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    out.text("\nRunning command: appcenter test run xcuitest " + this._args.args.join(" ") + "\n");
    return new RunXCUITestCommand(this._args).run(client, portalBaseUrl);
  }
}
