import { ErrorCodes, failure } from "../../../../util/commandline";
import { MobileCenterClient, models, clientRequest, ClientResponse } from "../../../../util/apis";
import { DefaultApp } from "../../../../util/profile";
import { out } from "../../../../util/interaction";
import { inspect } from "util";

export async function showDistributionGroupView(client: MobileCenterClient, app: DefaultApp, distributionGroup: string, debug: any) {
  // creating distribution group users list request
  const distributionGroupMembersRequestResponse = clientRequest<models.DistributionGroupUserGetResponse[]>(
    (cb) => client.distributionGroups.listUsers(app.ownerName, app.appName, distributionGroup, cb));

  // creating releases information request
  const basicReleasesDetailsRequestResponse = clientRequest<models.BasicReleaseDetails[]>(
    (cb) => client.releases.listByDistributionGroup(distributionGroup, app.ownerName, app.appName, cb));

  // show spinner and wait for the requests to finish
  await out.progress("Loading distribution group information...", 
    Promise.all([distributionGroupMembersRequestResponse, basicReleasesDetailsRequestResponse].map((p) => p.catch(() => Promise.resolve()))));

  let distributionGroupMembers: models.DistributionGroupUserGetResponse[];
  try {
    debug(`Getting users of distribution group ${distributionGroup}`);
    let response = await distributionGroupMembersRequestResponse;
    if (response.response.statusCode < 400) {        
      distributionGroupMembers = response.result;
    } else {
      throw response.response.statusCode;
    }
  } catch (error) {
    if (error === 404) {
      throw failure(ErrorCodes.InvalidParameter, `distribution group ${distributionGroup} was not found`);
    } else {
      debug(`Failed to get list of distribution group members - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to retrieve list of distribution group users");
    }
  }

  let basicReleasesDetails: models.BasicReleaseDetails[];
  try {
    debug(`Getting releases details for distribution group ${distributionGroup}`);
    let response = await basicReleasesDetailsRequestResponse;
    if (response.response.statusCode < 400) {
      basicReleasesDetails = response.result;
    } else {
      throw response.response.statusCode;
    }
  } catch (error) {
    debug(`Failed to get releases for the distribution group - ${inspect(error)}`);
    throw failure(ErrorCodes.Exception, "failed to retrieve releases details for the distribution group");
  }

  out.reportTitledGroupsOfTables([{
    reportFormat: [
      ["Display Name", "displayName"],
      ["Email", "email"]
    ],
    tables: distributionGroupMembers,
    title: "Users:"
  }, {
    reportFormat: [
      ["ID", "id"],
      ["Short Version", "shortVersion"],
      ["Version", "version"],
      ["Uploaded At", "uploadedAt", out.report.asDate]
    ],
    tables: basicReleasesDetails,
    title: "Releases:"
  }]);
}
