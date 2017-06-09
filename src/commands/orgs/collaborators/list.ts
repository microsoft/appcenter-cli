import { Command, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:orgs:collaborators:list");
import { inspect } from "util";
import { getPortalOrgLink } from "../../../util/portal/portal-helper";
import { getOrgUsers } from "../lib/org-users-helper";

@help("Lists collaborators of organization")
export default class OrgCollaboratorsListCommand extends Command {
  @help("Name of the organization")
  @shortName("n")
  @longName("name")
  @required
  @hasArg
  name: string;

  async run(client: MobileCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const users: models.OrganizationUserResponse[] = await getOrgUsers(client, this.name, debug);

    out.table(out.getNoTableBordersOptions(), users.map((user) => [user.name, user.email]));

    return success();
  }
}
