import { AppCommand, CommandArgs, CommandResult,
         help, success, name, longName, shortName, required, hasArg,
         failure } from "../../util/commandLine";
import { StateChecker } from "./lib/state-checker";
import { MobileCenterClient } from "../../util/apis";
import { Messages } from "./lib/help-messages";

@help(Messages.TestCloud.Commands.CheckState)
export default class CheckStateCommand extends AppCommand {
  @help(Messages.TestCloud.Arguments.CheckStateTestRunId)
  @longName("test-run-id")
  @required
  @hasArg
  testRunId: string;

  @help(Messages.TestCloud.Arguments.CheckStateContinuous)
  @longName("continuous")
  @shortName("c")
  continuous: boolean;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    let checker = new StateChecker(client, this.testRunId, this.app.ownerName, this.app.appName);

    let exitCode = this.continuous ? await checker.checkUntilCompleted() : await checker.checkOnce(); 

    if (!exitCode) {
      return success();
    }
    else {
      return failure(exitCode, "Test run failed. Please inspect logs for more details");
    }
  }
}