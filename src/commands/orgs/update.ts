import { Command, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../util/commandline";
import { out } from "../../util/interaction";
import { AppCenterClient, models, clientRequest } from "../../util/apis";

const debug = require("debug")("appcenter-cli:commands:orgs:update");
import { inspect } from "util";

@help("Update organization information")
export default class OrgUpdateCommand extends Command {
  @help("Name of the organization")
  @shortName("n")
  @longName("name")
  @required
  @hasArg
  name: string;

  @help("New organization display name")
  @shortName("d")
  @longName("new-display-name")
  @hasArg
  newDisplayName: string;

  @help("New organization name")
  @shortName("r")
  @longName("new-name")
  @hasArg
  newName: string;

  async run(client: AppCenterClient): Promise<CommandResult> {
    if (this.newDisplayName == null && this.newName == null) {
      return failure(ErrorCodes.InvalidParameter, "nothing to update");
    }

    try {
      const httpContent = await out.progress("Updating organization...", clientRequest<models.OrganizationResponse>((cb) => client.organizations.update(this.name, {
        displayName: this.newDisplayName,
        name: this.newName
      }, cb)));
      if (httpContent.response.statusCode < 400) {
        if (this.newDisplayName) {
          out.text(`Successfully changed display name of ${this.name} to ${this.newDisplayName}`);
        }
        if (this.newName) {
          out.text(`Successfully renamed ${this.name} to ${this.newName}`);
        }
      } else {
        throw httpContent.response;
      }
    } catch (error) {
      switch (error.statusCode) {
        case 404:
          return failure(ErrorCodes.InvalidParameter, `organization ${this.name} doesn't exist`);
        case 409:
          return failure(ErrorCodes.InvalidParameter, `organization ${this.newName} already exists`);
        default:
          debug(`Failed to update organization - ${inspect(error)}`);
          return failure(ErrorCodes.Exception, `failed to update organization`);
      }
    }

    return success();
  }
}
