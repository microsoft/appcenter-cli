import { AppCommand, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { DefaultApp } from "../../../util/profile";
import { getUsersList } from "../../../util/misc/list-of-users-helper";

const debug = require("debug")("appcenter-cli:commands:distribute:groups:update");

@help("Update existing distribution group")
export default class UpdateDistributionGroupCommand extends AppCommand {
  @help("Distribution group name")
  @shortName("g")
  @longName("group")
  @required
  @hasArg
  public distributionGroup: string;

  @help("New distribution group name")
  @shortName("n")
  @longName("name")
  @hasArg
  public newDistributionGroupName: string;

  @help("List of testers to add (use space-separated list of e-mails)")
  @shortName("t")
  @longName("add-testers")
  @hasArg
  public testersToAdd: string;

  @help("List of testers to delete (use space-separated list of e-mails)")
  @shortName("d")
  @longName("delete-testers")
  @hasArg
  public testersToDelete: string;

  @help("Path to file containing list of testers to add")
  @shortName("T")
  @longName("add-testers-file")
  @hasArg
  public testersToAddListFile: string;

  @help("Path to file containing list of testers to delete")
  @shortName("D")
  @longName("delete-testers-file")
  @hasArg
  public testersToDeleteListFile: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app = this.app;

    // validate that string and file properties are not specified simultaneously
    this.validateParameters();

    // validating parameters and loading provided files (if any)
    const testersToAdd = getUsersList(this.testersToAdd, this.testersToAddListFile, debug);
    const testersToDelete = getUsersList(this.testersToDelete, this.testersToDeleteListFile, debug);
    const newDistributionGroupNameValidation = this.isDistributionGroupNameFree(client, app, this.newDistributionGroupName);

    // showing spinner while parameters are validated
    const [testersToAddEmails, testersToDeleteEmails] = await out.progress("Validating parameters...", Promise.all([testersToAdd, testersToDelete, newDistributionGroupNameValidation]));

    let deletedTestersEmails: string[];
    if (testersToDeleteEmails.length) {
      debug("Deleting testers from distribution group");
      deletedTestersEmails = await this.deleteTestersFromDistributionGroup(client, app, testersToDeleteEmails);
    } else {
      deletedTestersEmails = [];
    }

    let addedTestersEmails: string[];
    if (testersToAddEmails.length) {
      debug("Adding testers to distribution group");
      addedTestersEmails = await this.addTestersToDistributionGroup(client, app, testersToAddEmails);
    } else {
      addedTestersEmails = [];
    }

    let currentGroupName: string;
    if (!_.isNil(this.newDistributionGroupName)) {
      debug("Renaming the distribution group");
      currentGroupName = await this.renameDistributionGroup(client, app, this.newDistributionGroupName);
    } else {
      currentGroupName = this.distributionGroup;
    }

    if (deletedTestersEmails.length !== testersToDeleteEmails.length || addedTestersEmails.length !== testersToAddEmails.length) {
      out.text("Updating the list of testers was partially successful");
    }

    out.text((result) => `Distribution group ${result.name} was successfully updated`, { name: currentGroupName, addedTesters: addedTestersEmails, deletedTesters: deletedTestersEmails});

    return success();
  }

  private validateParameters() {
    if (_.isNil(this.newDistributionGroupName) && _.isNil(this.testersToAdd) && _.isNil(this.testersToAddListFile) && _.isNil(this.testersToDelete) && _.isNil(this.testersToDeleteListFile)) {
      throw failure(ErrorCodes.InvalidParameter, "nothing to update");
    }
    if (!_.isNil(this.testersToAdd) && !_.isNil(this.testersToAddListFile)) {
      throw failure(ErrorCodes.InvalidParameter, "parameters 'add-testers' and 'add-testers-file' are mutually exclusive");
    }
    if (!_.isNil(this.testersToDelete) && !_.isNil(this.testersToDeleteListFile)) {
      throw failure(ErrorCodes.InvalidParameter, "parameters 'delete-testers' and 'delete-testers-file' are mutually exclusive");
    }
  }

  private async isDistributionGroupNameFree(client: AppCenterClient, app: DefaultApp, name: string) {
    if (!_.isNil(name)) {
      try {
        const httpRequest = await clientRequest<models.DistributionGroupResponse>((cb) => client.distributionGroups.get(app.ownerName, app.appName, name, cb));

        // Throw an exception if 404 error was not thrown during clientRequest
        throw httpRequest.response.statusCode;
      } catch (error) {
        if (error && error.response && error.response.statusCode === 404) {
          // 404 is correct status code for this case
          return;
        }

        if (error === 200) {
          throw failure(ErrorCodes.InvalidParameter, `distribution group ${name} already exists`);
        } else {
          debug(`Failed to check if the distribution group ${name} already exists - ${inspect(error)}`);
          throw failure(ErrorCodes.Exception, `failed to check if the distribution group ${name} already exists`);
        }
      }
    }
  }

  private async deleteTestersFromDistributionGroup(client: AppCenterClient, app: DefaultApp, userEmails: string[]): Promise<string[]> {
    try {
      const httpResponse = await out.progress("Deleting testers from the distribution group...",
        clientRequest<models.DistributionGroupUserDeleteResponse[]>((cb) => client.distributionGroups.removeUser(app.ownerName, app.appName, this.distributionGroup, {
          userEmails
        }, cb)));
      if (httpResponse.response.statusCode >= 400) {
        throw httpResponse.response.statusCode;
      } else {
        return httpResponse.result.filter((result) => result.status < 400).map((result) => result.userEmail);
      }
    } catch (error) {
      if (error === 404) {
        throw failure(ErrorCodes.InvalidParameter, `distribution group ${this.distributionGroup} doesn't exist`);
      } else {
        debug(`Failed to delete testers from the distribution group ${this.distributionGroup} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to delete testers from the distribution group`);
      }
    }
  }

  private async addTestersToDistributionGroup(client: AppCenterClient, app: DefaultApp, userEmails: string[]): Promise<string[]> {
    try {
      const httpResponse = await out.progress("Adding testers to the distribution group...",
        clientRequest<models.DistributionGroupUserPostResponse[]>((cb) => client.distributionGroups.addUser(app.ownerName, app.appName, this.distributionGroup, {
          userEmails
        }, cb)));
      if (httpResponse.response.statusCode >= 400) {
        throw httpResponse.response.statusCode;
      } else {
        return httpResponse.result.filter((result) => result.status < 400).map((result) => result.userEmail);
      }
    } catch (error) {
      if (error === 404) {
        throw failure(ErrorCodes.InvalidParameter, `distribution group ${this.distributionGroup} doesn't exist`);
      } else {
        debug(`Failed to add testers to the distribution group ${this.distributionGroup} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to add testers to the distribution group");
      }
    }
  }

  private async renameDistributionGroup(client: AppCenterClient, app: DefaultApp, newName: string): Promise<string> {
    try {
      const httpResponse = await out.progress("Renaming the distribution group...",
        clientRequest<models.DistributionGroupResponse>((cb) => client.distributionGroups.update(app.ownerName, app.appName, this.distributionGroup, {
          name: newName,
        }, cb)));
      if (httpResponse.response.statusCode >= 400) {
        throw httpResponse.response.statusCode;
      } else {
        return newName;
      }
    } catch (error) {
      switch (error) {
        case 400:
          throw failure(ErrorCodes.InvalidParameter, `${this.distributionGroup} group can't be renamed`);
        case 404:
          throw failure(ErrorCodes.InvalidParameter, `distribution group ${this.distributionGroup} doesn't exist`);
        default:
          debug(`Failed to rename the distribution group ${this.distributionGroup} - ${inspect(error)}`);
          throw failure(ErrorCodes.Exception, `failed to rename the distribution group`);
      }
    }
  }
}
