import { CommandArgs, CommandResult, AppCommand } from "../../../../util/commandline";
import RunEspressoTestsCommand from "../../run/espresso";
import { AppCenterClient } from "../../../../util/apis";
import { out } from "../../../../util/interaction";

export default class RunEspressoInteractiveTestsCommand extends AppCommand {

  private _args: CommandArgs;
  constructor(args: CommandArgs, interactiveArgs: string[]) {
    super(args);
    this._args = args;
    this._args.args.push(...interactiveArgs);
  }

  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    out.text("\nRunning command: " + this._args.command.join(" ") + this._args.args.join(" ") + "\n");
    return new RunEspressoTestsCommand(this._args).run(client, portalBaseUrl);
  }
}
