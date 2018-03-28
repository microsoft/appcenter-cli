import { Command, CommandResult, help, success, shortName, longName, hasArg, required } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { AppCenterClient, models } from "../../../util/apis";

const debug = require("debug")("appcenter-cli:commands:orgs:collaborators:list");
import { getOrgUsers } from "../lib/org-users-helper";

@help("Lists collaborators of organization")
export default class OrgCollaboratorsListCommand extends Command {
  @help("Name of the organization")
  @shortName("n")
  @longName("name")
  @required
  @hasArg
  name: string;

  async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const users: models.OrganizationUserResponse[] = await getOrgUsers(client, this.name, debug);

    out.table(out.getCommandOutputTableOptions(["Name", "Display Name", "Email"]), users.map((user) => [user.name, user.displayName, user.email]));

    return success();
  }
}
