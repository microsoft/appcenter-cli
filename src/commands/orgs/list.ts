import { Command, CommandResult, help, success } from "../../util/commandline";
import { out } from "../../util/interaction";
import { AppCenterClient } from "../../util/apis";

import { getOrgsNamesList } from "./lib/org-users-helper";

@help("Lists organizations in which current user is collaborator")
export default class OrgListCommand extends Command {
  async run(client: AppCenterClient): Promise<CommandResult> {
    // every user is a collaborator of it's own group and of zero or more external groups
    const orgs = await out.progress("Loading list of organizations...", getOrgsNamesList(client));
    const table = orgs.map((names) => [names.displayName, names.name]);

    out.table(out.getCommandOutputTableOptions(["Display Name", "Name"]), table);

    return success();
  }
}
