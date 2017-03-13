import { DefaultApp } from "../../../../util/profile";
import { models } from "../../../../util/apis";
import * as PortalHelper from "../../../../util/portal/portal-helper";
import { out } from "../../../../util/interaction";
import * as _ from "lodash";

export function reportBuild(build: models.Build, commitInfo: models.CommitDetails, app: DefaultApp, portalBaseUrl: string) {
  const outputObject = _.extend(_.clone(build), {
    author: `${commitInfo.commit.author.name} <${commitInfo.commit.author.email}>`,
    message: commitInfo.commit.message,
    sha: commitInfo.sha,
    url: PortalHelper.getPortalBuildLink(portalBaseUrl, app.ownerName, app.appName, build.sourceBranch, build.id.toString())
  });

  out.report([
    ["Branch", "sourceBranch"],
    ["Build number", "buildNumber"],
    ["Build status", "status"],
    ["Build result", "result"],
    ["Build URL", "url"],
    ["Commit author", "author"],
    ["Commit message", "message"],
    ["Commit SHA", "sha"],
  ], outputObject);
}
