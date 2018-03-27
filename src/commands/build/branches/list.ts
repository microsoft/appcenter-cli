import { getBuildReportObject, reportBuilds } from "./lib/format-build";
import { AppCommand, CommandResult, ErrorCodes, failure, help, success } from "../../../util/commandline";
import { AppCenterClient, models, clientRequest, ClientResponse } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";

const debug = require("debug")("appcenter-cli:commands:build:branches:list");

@help("Show list of branches")
export default class ShowBranchesListBuildStatusCommand extends AppCommand {

  async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const app = this.app;

    debug(`Getting list of branches for app ${app.appName}`);
    let branchesStatusesRequestResponse: ClientResponse<models.BranchStatus[]>;
    try {
      branchesStatusesRequestResponse = await out.progress(`Getting statuses for branches of app ${app.appName}...`,
        clientRequest<models.BranchStatus[]>((cb) => client.builds.listBranches(app.ownerName, app.appName, cb)));
    } catch (error) {
      debug(`Request failed - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "failed to fetch branches list");
    }

    const branchBuildsHttpResponseCode = branchesStatusesRequestResponse.response.statusCode;

    if (branchBuildsHttpResponseCode >= 400) {
      switch (branchBuildsHttpResponseCode) {
        case 400:
          return failure(ErrorCodes.IllegalCommand, `app ${app.appName} is not configured for building`);
        default:
          debug(`Request failed - HTTP ${branchBuildsHttpResponseCode} ${branchesStatusesRequestResponse.response.statusMessage}`);
          return failure(ErrorCodes.Exception, "failed to fetch branches list");
      }
    }

    const branchesWithBuilds = _(branchesStatusesRequestResponse.result)
      .filter((branch) => !_.isNil(branch.lastBuild))
      .sortBy((b) => b.lastBuild.sourceBranch)
      .value();

    if (branchesWithBuilds.length === 0) {
      out.text(`There are no configured branches for the app ${app.appName}`);
      return success();
    }

    const buildShas = branchesWithBuilds.map((branch) => branch.lastBuild.sourceVersion);

    debug("Getting commit info for the last builds of the branches");
    let commitInfoRequestResponse: ClientResponse<models.CommitDetails[]>;
    try {
      commitInfoRequestResponse = await out.progress("Getting commit info for the last builds of branches...",
        clientRequest<models.CommitDetails[]>((cb) => client.commits.listByShaList(buildShas, app.ownerName, app.appName, cb)));
    } catch (error) {
      debug(`Request failed - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "failed to get commit details");
    }

    const commits = commitInfoRequestResponse.result;

    const buildReportObjects = branchesWithBuilds.map((branch, index) => getBuildReportObject(branch.lastBuild, commits[index], app, portalBaseUrl));
    reportBuilds(buildReportObjects);

    return success();
  }
}
