import { out } from "../../../util/interaction";
import { models } from "../../../util/apis";
import { ProjectDescription, IAndroidJavaProjectDescription, IIosObjectiveCSwiftProjectDescription } from "./project-description";

export function reportProject(app: models.AppResponse, projectDescription: ProjectDescription): void {
  reportApp(app);

  switch (app.os) {
    case "Android":
      switch (app.platform) {
        case "Java":
          reportAndroidJava(projectDescription as IAndroidJavaProjectDescription);
          break;
      }
      break;

    case "iOS":
      switch (app.platform) {
        case "Objective-C-Swift":
          reportIosObjectiveCSwift(projectDescription as IIosObjectiveCSwiftProjectDescription);
          break;
      }
      break;

    default:
      break;
  }
}

function reportApp(app: models.AppResponse): void {
  out.report(
    [
      ["App", "name"],
      ["App secret", "appSecret"],
      ["OS", "os"],
      ["Platform", "platform"]
    ], app);
}

function reportIosObjectiveCSwift(projectDescription: IIosObjectiveCSwiftProjectDescription): void {
  out.report(
    [
      ["Project or workspace path", "projectOrWorkspacePath"],
      ["Podfile path", "podfilePath"]
    ], projectDescription);
}

function reportAndroidJava(projectDescription: IAndroidJavaProjectDescription): void {
  out.report(
  [
    [ "Gradle module", "moduleName"],
    [ "Build variant", "buildVariant"],
  ], projectDescription);
}