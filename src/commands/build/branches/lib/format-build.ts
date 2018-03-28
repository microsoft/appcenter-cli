import { DefaultApp } from "../../../../util/profile";
import { models } from "../../../../util/apis";
import * as PortalHelper from "../../../../util/portal/portal-helper";
import { out } from "../../../../util/interaction";
import * as _ from "lodash";

const reportFormat = [
  ["Branch", "sourceBranch"],
  ["Build ID", "buildNumber"],
  ["Build status", "status"],
  ["Build result", "result"],
  ["Build URL", "url"],
  ["Commit author", "author"],
  ["Commit message", "message"],
  ["Commit SHA", "sha"],
];

export type BuildReportObject = { sourceBranch: string, buildNumber: string, status: string, result: string, author: string, message: string, sha: string, url: string };

export function getBuildReportObject(build: models.Build, commitInfo: models.CommitDetails, app: DefaultApp, portalBaseUrl: string): BuildReportObject {
  return _(build).pick(["sourceBranch", "buildNumber", "status", "result"]).extend({
    author: `${commitInfo.commit.author.name} <${commitInfo.commit.author.email}>`,
    message: commitInfo.commit.message,
    sha: commitInfo.sha,
    url: PortalHelper.getPortalBuildLink(portalBaseUrl, app.ownerName, app.appName, build.sourceBranch, build.id.toString())
  }).value() as BuildReportObject;
}

export function reportBuild(outputObject: BuildReportObject) {
  out.report(reportFormat, outputObject);
}

export function reportBuilds(outputObjects: BuildReportObject[]) {
  out.reportNewLineSeparatedArray(reportFormat, outputObjects);
}
