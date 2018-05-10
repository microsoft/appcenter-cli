import { Command, CommandResult, ErrorCodes, failure, help, success, shortName, longName, required, hasArg } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import * as Os from "os";
import { getUsersList } from "../../../util/misc/list-of-users-helper";
import { getOrgUsers } from "../lib/org-users-helper";

const debug = require("debug")("appcenter-cli:commands:orgs:collaborators:update");
const pLimit = require("p-limit");

@help("Update list of organization collaborators")
export default class OrgCollaboratorsUpdateCommand extends Command {
  @help("Name of the organization")
  @shortName("n")
  @longName("name")
  @required
  @hasArg
  name: string;

  @help("List of collaborators to add")
  @shortName("c")
  @longName("add-collaborators")
  @hasArg
  collaboratorsToAdd: string;

  @help("Path to the list of collaborators to add")
  @shortName("C")
  @longName("add-collaborators-file")
  @hasArg
  collaboratorsToAddFile: string;

  @help("List of collaborators to delete")
  @shortName("d")
  @longName("delete-collaborators")
  @hasArg
  collaboratorsToDelete: string;

  @help("Path to the list of collaborators to delete")
  @shortName("D")
  @longName("delete-collaborators-file")
  @hasArg
  collaboratorsToDeleteFile: string;

  @help("List of collaborators to make admins")
  @shortName("a")
  @longName("make-admins")
  @hasArg
  collaboratorsToMakeAdmins: string;

  @help("Path to the list of collaborators to make admins")
  @shortName("A")
  @longName("make-admins-file")
  @hasArg
  collaboratorsToMakeAdminsFile: string;

  @help("List of admins to make collaborators")
  @shortName("m")
  @longName("make-collaborators")
  @hasArg
  adminsToMakeCollaborators: string;

  @help("Path to the list of admins to make collaborators")
  @shortName("M")
  @longName("make-collaborators-file")
  @hasArg
  adminsToMakeCollaboratorsFile: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    // validate that string and file properties are not specified simultaneously
    this.validateParameters();

    // loading user lists and lists of org users and org invitations
    const collaboratorsToAddPromise = getUsersList(this.collaboratorsToAdd, this.collaboratorsToAddFile, debug);
    const collaboratorsToDeletePromise = getUsersList(this.collaboratorsToDelete, this.collaboratorsToDeleteFile, debug);
    const collaboratorsToMakeAdminsPromise = getUsersList(this.collaboratorsToMakeAdmins, this.collaboratorsToMakeAdminsFile, debug);
    const adminsToMakeCollaboratorsPromise = getUsersList(this.adminsToMakeCollaborators, this.adminsToMakeCollaboratorsFile, debug);
    const usersInvitedToOrgPromise = this.getUsersInvitedToOrg(client);
    const usersJoinedOrgPromise = getOrgUsers(client, this.name, debug);

    // showing spinner while prerequisites are being loaded
    const [collaboratorsToAdd, collaboratorsToDelete, collaboratorsToMakeAdmins, adminsToMakeCollaborators, usersInvitedToOrg, usersJoinedOrg] = await out.progress("Loading prerequisites...",
      Promise.all([collaboratorsToAddPromise, collaboratorsToDeletePromise, collaboratorsToMakeAdminsPromise, adminsToMakeCollaboratorsPromise, usersInvitedToOrgPromise, usersJoinedOrgPromise]));

    let addedCollaborators: string[];
    let deletedCollaborators: string[];
    if (collaboratorsToAdd.length || collaboratorsToDelete.length) {
      const joinedUserEmailsToUserObject = this.toUserEmailMap(usersJoinedOrg);
      const userJoinedOrgEmails = Array.from(joinedUserEmailsToUserObject.keys());

      addedCollaborators = await out.progress("Adding collaborators...", this.addCollaborators(client, collaboratorsToAdd, usersInvitedToOrg, userJoinedOrgEmails));

      // updating list of invited users
      addedCollaborators.forEach((collaborator) => {
        if (usersInvitedToOrg.indexOf(collaborator) === -1) {
          usersInvitedToOrg.push(collaborator);
        }
      });

      deletedCollaborators = await out.progress("Deleting collaborators...", this.deleteCollaborators(client, collaboratorsToDelete, usersInvitedToOrg, joinedUserEmailsToUserObject));
    } else {
      addedCollaborators = [];
      deletedCollaborators = [];
    }

    let toAdmins: string[];
    let toCollaborators: string[];
    if (collaboratorsToMakeAdmins.length || adminsToMakeCollaborators.length) {
      // just deleted org users should be excluded from role changing
      const joinedUserEmailsToUserObject = this.toUserEmailMap(usersJoinedOrg.filter((user) => deletedCollaborators.indexOf(user.email) === -1));

      toAdmins = await out.progress("Changing role to admins...", this.changeUsersRole(client, collaboratorsToMakeAdmins, joinedUserEmailsToUserObject, "admin"));

      // updating roles after setting admins
      Array.from(joinedUserEmailsToUserObject.values()).filter((user) => collaboratorsToMakeAdmins.indexOf(user.email) > -1).forEach((user) => user.role = "admin");

      toCollaborators = await out.progress("Changing role to collaborator...", this.changeUsersRole(client, adminsToMakeCollaborators, joinedUserEmailsToUserObject, "collaborator"));
    } else {
      toAdmins = [];
      toCollaborators = [];
    }

    out.text((result) => {
      const stringArray: string[] = [];

      if (result.addedCollaborators.length) {
        stringArray.push(`Successfully added ${result.addedCollaborators.length} collaborators to organization`);
      }
      if (result.deletedCollaborators.length) {
        stringArray.push(`Successfully deleted ${result.deletedCollaborators.length} collaborators from organization`);
      }
      if (result.toAdmins.length) {
        stringArray.push(`Successfully changed roles for ${result.toAdmins.length} collaborators to "admin"`);
      }
      if (result.toCollaborators.length) {
        stringArray.push(`Successfully changed roles for ${result.toCollaborators.length} admins to "collaborator"`);
      }

      return stringArray.join(Os.EOL);
    }, {addedCollaborators, deletedCollaborators, toAdmins, toCollaborators});

    return success();
  }

  private validateParameters() {
    if (!(this.collaboratorsToAdd || this.collaboratorsToAddFile
        || this.collaboratorsToDelete || this.collaboratorsToDeleteFile
        || this.collaboratorsToMakeAdmins || this.collaboratorsToMakeAdminsFile
        || this.adminsToMakeCollaborators || this.adminsToMakeCollaboratorsFile)) {
      throw failure(ErrorCodes.InvalidParameter, "nothing to update");
    }
    if (this.collaboratorsToAdd && this.collaboratorsToAddFile) {
      throw failure(ErrorCodes.InvalidParameter, "parameters '--add-collaborators' and '--add-collaborators-file' are mutually exclusive");
    }
    if (this.collaboratorsToDelete && this.collaboratorsToDeleteFile) {
      throw failure(ErrorCodes.InvalidParameter, "parameters '--delete-collaborators' and '--delete-collaborators-file' are mutually exclusive");
    }
    if (this.collaboratorsToMakeAdmins && this.collaboratorsToMakeAdminsFile) {
      throw failure(ErrorCodes.InvalidParameter, "parameters '--make-admins' and '--make-admins-file' are mutually exclusive");
    }
    if (this.adminsToMakeCollaborators && this.adminsToMakeCollaboratorsFile) {
      throw failure(ErrorCodes.InvalidParameter, "parameters '--make-collaborators' and '--make-collaborators-file' are mutually exclusive");
    }
  }

  private async getUsersInvitedToOrg(client: AppCenterClient): Promise<string[]> {
    try {
      const httpRequest = await clientRequest<models.AppInvitationDetailResponse[]>((cb) => client.orgInvitations.listPending(this.name, cb));
      if (httpRequest.response.statusCode < 400) {
        return httpRequest.result.map((invitation) => invitation.email);
      } else {
        throw httpRequest.response;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `organization ${this.name} doesn't exist`);
      } else {
        debug(`Failed to get list of user invitations for organization ${this.name} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to get list of user invitations for organization ${this.name}`);
      }
    }
  }

  private getLimiter(): (callback: () => Promise<any>) => Promise<any> {
    return pLimit(10);
  }

  private async addCollaborators(client: AppCenterClient, collaborators: string[], usersInvitedToOrg: string[], usersJoinedOrg: string[]): Promise<string[]> {
    const limiter = this.getLimiter();
    const filteredCollaborators = _.difference(collaborators, usersJoinedOrg); // no need to add users already joined org

    await Promise.all(filteredCollaborators
      .map((collaborator) =>
        limiter(() => usersInvitedToOrg.some((invited) => invited === collaborator) ? this.resendInvitationToUser(client, collaborator) : this.sendInvitationToUser(client, collaborator))));

    return filteredCollaborators;
  }

  private async sendInvitationToUser(client: AppCenterClient, collaborator: string): Promise<void> {
    try {
      const httpResponse = await clientRequest((cb) => client.orgInvitations.create(this.name, collaborator, cb));
      if (httpResponse.response.statusCode >= 400) {
        throw httpResponse.response;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `organization ${this.name} doesn't exist`);
      } else {
        debug(`Failed to send invitation for ${collaborator} to organization ${this.name} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to send invitation for ${collaborator} to organization ${this.name}`);
      }
    }
  }

  private async resendInvitationToUser(client: AppCenterClient, collaborator: string): Promise<void> {
    try {
      const httpResponse = await clientRequest((cb) => client.orgInvitations.sendNewInvitation(this.name, collaborator, cb));
      if (httpResponse.response.statusCode >= 400) {
        throw httpResponse.response;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `organization ${this.name} doesn't exist`);
      } else {
        debug(`Failed to re-send invitation for ${collaborator} to organization ${this.name} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to re-send invitation for ${collaborator} to organization ${this.name}`);
      }
    }
  }

  private async deleteCollaborators(client: AppCenterClient, collaborators: string[], usersInvitedToOrg: string[], joinedUserEmailsToUserObject: Map<string, models.OrganizationUserResponse>): Promise<string[]> {
    const limiter = this.getLimiter();
    const userActions: Array<Promise<void>> = [];
    const collaboratorsForDeletion: string[] = [];

    for (const collaborator of collaborators) {
      if (joinedUserEmailsToUserObject.has(collaborator)) {
        // user has already joined the org, deleting them
        userActions.push(limiter(() => this.deleteUserFromOrganization(client, joinedUserEmailsToUserObject.get(collaborator).name)));
        collaboratorsForDeletion.push(collaborator);
      } else if (usersInvitedToOrg.indexOf(collaborator) > -1) {
        // user was invited to the org, cancel invite
        userActions.push(limiter(() => this.cancelUserInvitation(client, collaborator)));
        collaboratorsForDeletion.push(collaborator);
      }
      // otherwise nothing to do
    }

    await Promise.all(userActions);

    return collaboratorsForDeletion;
  }

  private async cancelUserInvitation(client: AppCenterClient, collaborator: string): Promise<void> {
    try {
      const httpResponse = await clientRequest((cb) => client.orgInvitations.deleteMethod(this.name, collaborator, cb));
      if (httpResponse.response.statusCode >= 400) {
        throw httpResponse.response;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `organization ${this.name} doesn't exist`);
      } else {
        debug(`Failed to cancel invitation for ${collaborator} to organization ${this.name} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to cancel invitation for ${collaborator} to organization ${this.name}`);
      }
    }
  }

  private async deleteUserFromOrganization(client: AppCenterClient, collaboratorName: string): Promise<void> {
    try {
      const httpResponse = await clientRequest((cb) => client.users.removeFromOrg(this.name, collaboratorName, cb));
      if (httpResponse.response.statusCode >= 400) {
        throw httpResponse.response;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `organization ${this.name} doesn't exist`);
      } else {
        debug(`Failed to delete user ${collaboratorName} from organization ${this.name} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to delete user ${collaboratorName} from organization ${this.name}`);
      }
    }
  }

  private async changeUsersRole(client: AppCenterClient, collaborators: string[], userJoinedOrgToRole: Map<string, models.OrganizationUserResponse>, role: UserRole): Promise<string[]> {
    const limiter = this.getLimiter();
    // no need to change role for non-collaborators and collaborators with target role
    const filteredCollaboratorsNames = collaborators
      .filter((collaborator) => userJoinedOrgToRole.has(collaborator) && userJoinedOrgToRole.get(collaborator).role !== role)
      .map((collaborator) => userJoinedOrgToRole.get(collaborator).name);

    await Promise.all(filteredCollaboratorsNames.map((collaboratorName) => limiter(() => this.changeUserRole(client, collaboratorName, role))));

    return filteredCollaboratorsNames;
  }

  private async changeUserRole(client: AppCenterClient, collaboratorName: string, role: UserRole): Promise<void> {
    try {
      const httpResponse = await clientRequest((cb) => client.users.updateOrgRole(this.name, collaboratorName, {
        role
      }, cb));
      if (httpResponse.response.statusCode >= 400) {
        throw httpResponse.response;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        throw failure(ErrorCodes.InvalidParameter, `organization ${this.name} doesn't exist`);
      } else {
        debug(`Failed to change role of ${collaboratorName} to ${role} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to change role of ${collaboratorName} to ${role}`);
      }
    }
  }

  private toUserEmailMap(users: models.OrganizationUserResponse[]): Map<string, models.OrganizationUserResponse> {
    return new Map<string, models.OrganizationUserResponse>(users.map((user) => [user.email, user] as [string, models.OrganizationUserResponse]));
  }
}

type UserRole = "admin" | "collaborator";
