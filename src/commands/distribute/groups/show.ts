import {
  AppCommand,
  CommandResult,
  help,
  success,
  shortName,
  longName,
  required,
  hasArg,
  ErrorCodes,
  failure,
} from "../../../util/commandline";
import { AppCenterClient, models } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";

const debug = require("debug")("appcenter-cli:commands:distribute:groups:show");

@help("Shows information about the distribution group")
export default class ShowDistributionGroupCommand extends AppCommand {
  @help("Distribution group name")
  @shortName("g")
  @longName("group")
  @required
  @hasArg
  public distributionGroup: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    // creating distribution group users list request
    const distributionGroupMembersRequestResponse = client.distributionGroups.listUsers(
      app.ownerName,
      app.appName,
      this.distributionGroup
    );

    // creating releases information request
    const basicReleasesDetailsRequestResponse = client.releases.listByDistributionGroup(
      this.distributionGroup,
      app.ownerName,
      app.appName
    );

    // show spinner and wait for the requests to finish
    await out.progress(
      "Loading distribution group information...",
      Promise.all(
        [distributionGroupMembersRequestResponse, basicReleasesDetailsRequestResponse].map((p: Promise<any>) =>
          p.catch(() => Promise.resolve())
        )
      )
    );

    let distributionGroupMembers: models.DistributionGroupsListUsersResponse;
    try {
      debug(`Getting users of distribution group ${this.distributionGroup}`);
      distributionGroupMembers = await distributionGroupMembersRequestResponse;
    } catch (error) {
      if (error === 404) {
        throw failure(ErrorCodes.InvalidParameter, `distribution group ${this.distributionGroup} was not found`);
      } else {
        debug(`Failed to get list of distribution group members - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to retrieve list of distribution group users");
      }
    }

    let basicReleasesDetails: models.ReleasesListByDistributionGroupResponse;
    try {
      debug(`Getting releases details for distribution group ${this.distributionGroup}`);
      basicReleasesDetails = await basicReleasesDetailsRequestResponse;
    } catch (error) {
      debug(`Failed to get releases for the distribution group - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to retrieve releases details for the distribution group");
    }

    out.reportTitledGroupsOfTables([
      {
        reportFormat: [
          ["Display Name", "displayName"],
          ["Email", "email"],
        ],
        tables: distributionGroupMembers,
        title: "Users:",
      },
      {
        reportFormat: [
          ["ID", "id"],
          ["Short Version", "shortVersion"],
          ["Version", "version"],
          ["Uploaded At", "uploadedAt", out.report.asDate],
        ],
        tables: basicReleasesDetails,
        title: "Releases:",
      },
    ]);

    return success();
  }
}
