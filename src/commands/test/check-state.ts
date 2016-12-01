import { AppCommand, CommandArgs, CommandResult,
         help, success, name, longName, required, hasArg,
         failure } from "../../util/commandLine";
import { StateChecker } from "./lib/state-checker";
import { MobileCenterClient } from "../../util/apis";
import { Messages } from "./lib/help-messages";

@help(Messages.TestCloud.Commands.CheckState)
export default class CheckStateCommand extends AppCommand {
  @help("Id of the test run")
  @longName("test-run-id")
  @required
  @hasArg
  testRunId: string;

  @help("Continuously checks the state until the test run completes")
  @longName("continuous")
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