import {
  AppCommand,
  CommandResult,
  ErrorCodes,
  failure,
  hasArg,
  help,
  longName,
  required,
  shortName,
  success,
} from "../../../util/commandline";
import { AppCenterClient } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { inspect } from "util";
import * as _ from "lodash";
import { reportBuild, getBuildReportObject } from "./lib/format-build";
import { BuildsListByBranchResponse, CommitsListByShaListResponse } from "../../../util/apis/generated/src";

const debug = require("debug")("appcenter-cli:commands:build:branches:show");

@help("Show branch build status")
export default class ShowBranchBuildStatusCommand extends AppCommand {
  @help("Branch name for status check")
  @shortName("b")
  @longName("branch")
  @required
  @hasArg
  public branchName: string;

  async run(client: AppCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const app = this.app;

    debug(`Getting builds for branch ${this.branchName}`);
    let builds : BuildsListByBranchResponse;
    try {
      builds = await out.progress(
        `Getting builds for branch ${this.branchName}...`,
        client.builds.listByBranch(this.branchName, app.ownerName, app.appName)
      );
    } catch (error) {
      if (error.statusCode === 400) {
        return failure(ErrorCodes.IllegalCommand, `app ${app.appName} is not configured for building`);
      } else {
        debug(`Request failed - ${inspect(error)}`);
        return failure(ErrorCodes.Exception, "the Branch Builds request was rejected for an unknown reason");
      }
    }

    if (builds.length === 0) {
      out.text(`There are no builds for the branch ${this.branchName}`);
      return success();
    }

    // Taking last build
    const lastBuild = _.maxBy(builds, (build) => Number(build.id));

    debug(`Getting commit info for commit ${lastBuild.sourceVersion}`);
    let commits: CommitsListByShaListResponse;
    try {
      commits = await out.progress(
        `Getting commit info for ${lastBuild.sourceVersion}...`,
        client.commits.listByShaList([lastBuild.sourceVersion], app.ownerName, app.appName)
      );
    } catch (error) {
      debug(`Request failed - ${inspect(error)}`);
      return failure(ErrorCodes.Exception, "the Branch Builds request was rejected for an unknown reason");
    }

    const commitInfo = commits[0];

    reportBuild(getBuildReportObject(lastBuild, commitInfo, app, portalBaseUrl));

    return success();
  }
}
