import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg } from "../../../util/commandline";
import { AppCenterClient, clientRequest } from "../../../util/apis";
import { out, prompt } from "../../../util/interaction";
import { inspect } from "util";

const debug = require("debug")("appcenter-cli:commands:distribute:groups:delete");

@help("Deletes the distribution group")
export default class DeleteDistributionGroupCommand extends AppCommand {
  @help("Distribution group name")
  @shortName("g")
  @longName("group")
  @required
  @hasArg
  public distributionGroup: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    if (!await prompt.confirm(`Do you really want to delete distribution group ${this.distributionGroup}?`)) {
      out.text(`Deletion of distribution group ${this.distributionGroup} was cancelled`);
      return success();
    }

    try {
      const httpResponse = await out.progress(`Removing the distribution group...`,
        clientRequest((cb) => client.distributionGroups.deleteMethod(app.appName, app.ownerName, this.distributionGroup, cb)));
      if (httpResponse.response.statusCode >= 400) {
        throw httpResponse.response.statusCode;
      }
    } catch (error) {
      if (error === 404) {
        return failure(ErrorCodes.InvalidParameter, `distribution group ${this.distributionGroup} doesn't exists`);
      } else {
        debug(`Failed to remove the distribution group - ${inspect(error)}`);
        return failure(ErrorCodes.Exception, `failed to delete the distribution group`);
      }
    }

    out.text(`Distribution group ${this.distributionGroup} was deleted`);

    return success();
  }
}
