import { CommandArgs, help, CommandResult, AppCommand } from "../../../../util/commandline";
import { Messages } from "../../lib/help-messages";
import RunEspressoTestsCommand from "../../run/espresso";
import { AppCenterClient } from "../../../../util/apis";

export default class RunEspressoInteractiveTestsCommand extends AppCommand {

  private _args: CommandArgs;
  constructor(args: CommandArgs, interactiveArgs: string[]) {
    super(args);
    this._args = args;
    this._args.args.push(...interactiveArgs);
  }

  public async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    return new RunEspressoTestsCommand(this._args).run(client, portalBaseUrl);
  }
}
