import { AppCommand, CommandArgs, CommandResult,
         help, success, longName, required, hasArg } from "../../util/commandline";
import { AppCenterClient, clientCall } from "../../util/apis";
import { Messages } from "./lib/help-messages";

@help(Messages.TestCloud.Commands.Stop)
export default class StopCommand extends AppCommand {
  @help(Messages.TestCloud.Arguments.StopTestRunId)
  @longName("test-run-id")
  @required
  @hasArg
  testRunId: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: AppCenterClient): Promise<CommandResult> {

    await this.stopTestRun(client, this.testRunId);

    return success();
  }

  private stopTestRun(client: AppCenterClient, testRunId: string): Promise<VoidFunction> {
    return clientCall((cb) => {
      client.test.stopTestRun(
        testRunId,
        this.app.ownerName,
        this.app.appName,
        cb
      );
    });
  }
}
