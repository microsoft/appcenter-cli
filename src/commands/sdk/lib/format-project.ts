import { out } from "../../../util/interaction";
import { models } from "../../../util/apis";
import { IProjectDescription, IAndroidJavaProjectDescription, IIosObjectiveCSwiftProjectDescription } from "./project-description";

export function reportProject(projectDescription: IProjectDescription): void {
  switch (projectDescription.os) {
    case "Android":
      switch (projectDescription.platform) {
        case "Java":
          reportAndroidJava(projectDescription as IAndroidJavaProjectDescription);
          break;
      }
      break;

    case "iOS":
      switch (projectDescription.platform) {
        case "Objective-C-Swift":
          reportIosObjectiveCSwift(projectDescription as IIosObjectiveCSwiftProjectDescription);
          break;
      }
      break;

    default:
      break;
  }
}

function reportIosObjectiveCSwift(projectDescription: IIosObjectiveCSwiftProjectDescription): void {
  out.report(
    [
      ["App", "appName"],
      ["App secret", "appSecret"],
      ["OS", "os"],
      ["Platform", "platform"],
      ["Branch", "branchName"],
      ["Project or workspace path", "projectOrWorkspacePath"],
      ["Podfile path", "podfilePath"]
    ], projectDescription);
}

function reportAndroidJava(projectDescription: IAndroidJavaProjectDescription): void {
  out.report(
  [
    [ "App", "appName"],
    [ "App secret", "appSecret" ],
    [ "OS", "os"],
    [ "Platform", "platform"],
    [ "Branch", "branchName"],
    [ "Gradle module", "moduleName"],
    [ "Module path", "modulePath"],
    [ "Build variant", "buildVariant"],
  ], projectDescription);
}