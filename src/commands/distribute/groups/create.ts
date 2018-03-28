import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { DefaultApp } from "../../../util/profile";
import { getUsersList } from "../../../util/misc/list-of-users-helper";

const debug = require("debug")("appcenter-cli:commands:distribute:groups:create");

@help("Create new distribution group")
export default class CreateDistributionGroupCommand extends AppCommand {
  @help("Distribution group name")
  @shortName("n")
  @longName("name")
  @required
  @hasArg
  public distributionGroup: string;

  @help("List of testers (space-separated list of e-mails)")
  @shortName("t")
  @longName("testers")
  @hasArg
  public testers: string;

  @help("Path to file containing list of testers")
  @shortName("T")
  @longName("testers-file")
  @hasArg
  public testersListFile: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    // validate that 'testers' and 'testers-file' are not specified simultaneously
    this.validateParameters();

    // getting string with testers' emails
    debug("Getting list of testers");
    const testersEmails = await out.progress("Loading testers list file...", getUsersList(this.testers, this.testersListFile, debug));

    debug("Creating distribution group");
    await this.createDistributionGroup(client, app);

    // add testers if any were specified
    if (testersEmails.length) {
      debug("Adding testers to the distribution group");
      const addTestersResult = await this.addTestersToDistributionGroup(client, app, testersEmails);
      // filtering users which were actually added
      const addedUsers = addTestersResult.filter((userResult) => userResult.status < 400);
      out.text((obj) => `Successfully created the ${obj.distributionGroupName} distribution group with ${obj.testersAdded.length} testers`,
        {distributionGroupName: this.distributionGroup, testersAdded: addedUsers});
    } else {
      out.text((obj) => `Successfully created the ${obj.distributionGroupName} distribution group`,
        {distributionGroupName: this.distributionGroup, testersAdded: []});
    }

    return success();
  }

  private validateParameters() {
    if (!_.isNil(this.testers) && !_.isNil(this.testersListFile)) {
      throw failure(ErrorCodes.InvalidParameter, "parameters 'testers' and 'testers-file' are mutually exclusive");
    }
  }

  private async createDistributionGroup(client: AppCenterClient, app: DefaultApp) {
    try {
      const createDistributionGroupRequestResponse = await out.progress("Creating distribution group...",
        clientRequest((cb) => client.distributionGroups.create(app.ownerName, app.appName, this.distributionGroup, cb)));
      if (createDistributionGroupRequestResponse.response.statusCode >= 400) {
        throw createDistributionGroupRequestResponse.response.statusCode;
      }
    } catch (error) {
      if (error === 409) {
        throw failure(ErrorCodes.InvalidParameter, `distribution group ${this.distributionGroup} already exists`);
      } else {
        debug(`Failed to create distribution group ${this.distributionGroup} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to create distribution group");
      }
    }
  }

  private async addTestersToDistributionGroup(client: AppCenterClient, app: DefaultApp, users: string[]): Promise<models.DistributionGroupUserPostResponse[]> {
    try {
      const addUsersToDistributionGroupRequestResponse = await out.progress("Adding testers to the distribution group...",
        clientRequest<models.DistributionGroupUserPostResponse[]>((cb) => client.distributionGroups.addUser(app.ownerName, app.appName, this.distributionGroup, {
          userEmails: users
        }, cb)));
      if (addUsersToDistributionGroupRequestResponse.response.statusCode >= 400) {
        throw addUsersToDistributionGroupRequestResponse.response.statusCode;
      }
      return addUsersToDistributionGroupRequestResponse.result;
    } catch (error) {
      debug(`Failed to add testers to the new distribution group ${this.distributionGroup} - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to add testers to the new distribution group");
    }
  }
}
