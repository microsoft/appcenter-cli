import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg, isCommandFailedResult} from "../../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import * as Pfs from "../../../util/misc/promisfied-fs";
import { DefaultApp } from "../../../util/profile";

const debug = require("debug")("mobile-center-cli:commands:distribute:groups:create");

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

  public async run(client: MobileCenterClient): Promise<CommandResult> {
    try {
      return await this.doCommand(client);
    } catch (error) {
      if (isCommandFailedResult(error)) {
        return error;
      } else {
        throw error;
      }
    }
  }

  private async doCommand(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    // validate that 'testers' and 'testers-file' are not specified simultaneously
    this.validateParameters();

    // getting string with testers' emails
    const testersEmailsString = await this.getTestersString();

    debug("Creating distribution group");
    await this.createDistributionGroup(client, app);

    // extracting emails from test emails string
    const testersEmails = _.chain(testersEmailsString).words(/\S+/g).uniq().value();

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

  private async getTestersString(): Promise<string> {
    if (!_.isNil(this.testers)) {
      return this.testers;
    } else if (!_.isNil(this.testersListFile)) {
      try {
        debug("Reading file with the list of testers");
        return await out.progress("Loading testers list file...", Pfs.readFile(this.testersListFile, "utf8"));
      } catch (error) {
        if ((<NodeJS.ErrnoException> error).code === "ENOENT") {
          throw failure(ErrorCodes.InvalidParameter, `file ${this.testersListFile} doesn't exists`);
        } else {
          debug(`Failed to read file with list of testers - ${inspect(error)}`);
          throw failure(ErrorCodes.Exception, `failed to read file ${this.testersListFile}`);
        }
      }
    } else {
      return "";
    }
  }

  private async createDistributionGroup(client: MobileCenterClient, app: DefaultApp) {
    try {
      const createDistributionGroupRequestResponse = await out.progress("Creating distribution group...", 
        clientRequest((cb) => client.account.createDistributionGroup(app.ownerName, app.appName, this.distributionGroup, cb)));
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

  private async addTestersToDistributionGroup(client: MobileCenterClient, app: DefaultApp, users: string[]): Promise<models.DistributionGroupUserPostResponse[]> {
    try {
      const addUsersToDistributionGroupRequestResponse = await out.progress("Adding testers to the distribution group...",
        clientRequest<models.DistributionGroupUserPostResponse[]>((cb) => client.account.createDistributionGroupUsers(app.ownerName, app.appName, this.distributionGroup, {
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
