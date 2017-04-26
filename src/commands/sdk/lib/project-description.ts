import * as path from "path"
import { models } from "../../../util/apis/index";

export function getProjectDescription(app: models.AppResponse, appDir: string,
  branchName: string, branchConfig: models.BranchConfiguration): IProjectDescription {

  const projectDescription: IProjectDescription = {
    appName: app.name,
    appSecret: app.appSecret,
    os: app.os,
    platform: app.platform,
    branchName
  };

  switch (app.os) {
    case "Android":
      switch (app.platform) {
        case "Java":
          (projectDescription as IAndroidJavaProjectDescription).moduleName = branchConfig.toolsets.android.module;
          (projectDescription as IAndroidJavaProjectDescription).modulePath = path.join(appDir, branchConfig.toolsets.android.module, "build.gradle");
          (projectDescription as IAndroidJavaProjectDescription).buildVariant = branchConfig.toolsets.android.buildVariant;
          break;
        default:
          throw new Error(`Unsupported OS/Platform "${app.os}/${app.platform}"`);
      }
      break;

    case "iOS":
      switch (app.platform) {
        case "Objective-C-Swift":
          break;
        default:
          throw new Error(`Unsupported OS/Platform "${app.os}/${app.platform}"`);
      }
      break;

    default:
      throw new Error(`Unsupported OS "${app.os}"`);
  }

  return projectDescription;
}

export interface IProjectDescription {
  appName: string;
  appSecret: string;
  os: string;
  platform: string;
  branchName: string;
}

export interface IAndroidJavaProjectDescription extends IProjectDescription {
  moduleName: string;
  modulePath: string;
  buildVariant: string;
}

export interface IiOsObjectiveCSwiftProjectDescription extends IProjectDescription {
  
}