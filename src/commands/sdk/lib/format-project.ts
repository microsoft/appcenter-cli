import { out } from "../../../util/interaction";
import { models } from "../../../util/apis";
import { IProjectDescription } from "./project-description";

export function reportProject(projectDescription: IProjectDescription): void {
  switch (projectDescription.os) {
    case "Android":
      switch (projectDescription.platform) {
        case "Java":
          reportAndroidJava(projectDescription);
          break;
      }
      break;

    case "iOS":
      break;

    default:
      break;
  }
}

function reportAndroidJava(projectDescription: IProjectDescription): void {
  out.report(
  [
    [ "App", "displayName"],
    [ "App Secret", "appSecret" ],
    [ "OS", "os"],
    [ "Platform", "platform"],
    [ "Branch", "branchName"],
    [ "Gradle module", "moduleName"],
    [ "Module path", "modulePath"],
    [ "Build variant", "buildVariant"],
  ], {
    displayName: projectDescription.appName,
    appSecret: projectDescription.appSecret,
    os: projectDescription.os,
    platform: projectDescription.platform,
    branchName: projectDescription.branchName,
    moduleName: projectDescription.androidJava.moduleName,
    modulePath: projectDescription.androidJava.modulePath,
    buildVariant: projectDescription.androidJava.buildVariant
  });
}