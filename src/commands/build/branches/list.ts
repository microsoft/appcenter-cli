import { reportBuild } from "./lib/format-build";
import {AppCommand, Command, CommandArgs, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success} from "../../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import * as _ from "lodash";

const debug = require("debug")("mobile-center-cli:commands:build:branches:list");

@help("Show list of branches")
export default class ShowBranchesListBuildStatusCommand extends AppCommand {

  async run(client: MobileCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const app = this.app;

    debug(`Getting list of branches for app ${app.appName}`);
    const branchesStatusesRequestResponse = await out.progress(`Getting statuses for branches of app ${app.appName}...`, 
      clientRequest<models.BranchStatus[]>((cb) => client.buildOperations.getBranches(app.ownerName, app.appName, cb)));

    const branchBuildsHttpResponseCode = branchesStatusesRequestResponse.response.statusCode;

    if (branchBuildsHttpResponseCode >= 400) {
      return failure(ErrorCodes.Exception, "the Branches List request was rejected for an unknown reason");
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
    const commitInfoRequestResponse = await out.progress("Getting commit info for the last builds of branches...", 
      clientRequest<models.CommitDetails[]>((cb) => client.buildOperations.getCommits(buildShas.join(","), app.ownerName, app.appName, cb)));

    const commitInfoRequestResponseResponseCode = commitInfoRequestResponse.response.statusCode;

    if (commitInfoRequestResponseResponseCode >= 400) {
      return failure(ErrorCodes.Exception, "the Get Commits request was rejected for an unknown reason");
    }

    const commits = commitInfoRequestResponse.result;

    for (let i = 0; i < branchesWithBuilds.length; i++) {
      const branchBuild = branchesWithBuilds[i].lastBuild;
      const branchCommit = commits[i];

      if (i) {
        out.text("");
      }

      reportBuild(branchBuild, branchCommit, app, portalBaseUrl);
    }

    return success();
  }
}
