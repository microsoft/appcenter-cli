import { out } from "../../../util/interaction";
import { models } from "../../../util/apis";
import { IProjectDescription, IAndroidJavaProjectDescription, IiOsObjectiveCSwiftProjectDescription } from "./project-description";

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
      break;

    default:
      break;
  }
}

function reportAndroidJava(projectDescription: IAndroidJavaProjectDescription): void {
  out.report(
  [
    [ "App", "appName"],
    [ "App Secret", "appSecret" ],
    [ "OS", "os"],
    [ "Platform", "platform"],
    [ "Branch", "branchName"],
    [ "Gradle module", "moduleName"],
    [ "Module path", "modulePath"],
    [ "Build variant", "buildVariant"],
  ], projectDescription);
}