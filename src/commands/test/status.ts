import { AppCommand, CommandArgs, CommandResult,
         help, success, name, longName, shortName, required, hasArg,
         failure } from "../../util/commandline";
import { StateChecker } from "./lib/state-checker";
import { MobileCenterClient } from "../../util/apis";
import { Messages } from "./lib/help-messages";

@help(Messages.TestCloud.Commands.Status)
export default class StatusCommand extends AppCommand {
  @help(Messages.TestCloud.Arguments.StatusTestRunId)
  @longName("test-run-id")
  @required
  @hasArg
  testRunId: string;

  @help(Messages.TestCloud.Arguments.StatusContinuous)
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
      return failure(exitCode, `Test run failed. Returning exit code ${exitCode}.`);
    }
  }
}