import { Command, CommandArgs, CommandResult, help, success, failure, notLoggedIn } from "../../util/commandLine";
import { out } from "../../util/interaction";
import { getUser } from "../../util/profile";
import { SonomaClient, models, clientCall } from "../../util/apis";

@help("Submits tests to Sonoma")
export default class SubmitTestsCommand extends Command {
    constructor(args: CommandArgs) {
        super(args);
    }

    async run(client: SonomaClient): Promise<CommandResult> {
        return success();
    }
}