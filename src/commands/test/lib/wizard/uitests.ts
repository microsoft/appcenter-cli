import { CommandArgs, CommandResult, AppCommand } from "../../../../util/commandline";
import { AppCenterClient } from "../../../../util/apis";
import { out } from "../../../../util/interaction";
import RunUITestsCommand from "../../run/uitest";

export default class RunUitestWizardTestCommand extends AppCommand {

  private _args: CommandArgs;
  constructor(args: CommandArgs, interactiveArgs: string[]) {
    super(args);
    this._args = args;
    this._args.args.push(...interactiveArgs);
  }

  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    out.text("\nRunning command: appcenter test run uitest " + this._args.args.join(" ") + "\n");
    return new RunUITestsCommand(this._args).run(client, portalBaseUrl);
  }
}
