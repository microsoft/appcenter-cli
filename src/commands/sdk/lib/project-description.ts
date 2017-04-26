import * as path from "path"
import { models } from "../../../util/apis/index";

export function getProjectDescription(app: models.AppResponse, appDir: string,
    branchName: string, branchConfig: models.BranchConfiguration) : IProjectDescription {
  
  switch (app.os) {
    case "Android":
      switch (app.platform) {
        case "Java":
          return {
            appName: app.name,
            appSecret: app.appSecret,
            os: app.os,
            platform: app.platform,
            branchName,
            androidJava: {
              moduleName: branchConfig.toolsets.android.module,
              modulePath: path.join(appDir, branchConfig.toolsets.android.module, "build.gradle"),
              buildVariant: branchConfig.toolsets.android.buildVariant
            }
          }
        default: 
          throw new Error(`Unsupported OS/Platform "${app.os}/${app.platform}"`);
      }

    // case "iOS":
    //   break;
    
    default:
      throw new Error(`Unsupported OS "${app.os}"`);
  }
}

export interface IProjectDescription {
  appName: string;
  appSecret: string;
  os: string;
  platform: string;
  branchName: string;

  androidJava?: IAndroidJavaProjectDescription;
}

export interface IAndroidJavaProjectDescription {
  moduleName: string;
  modulePath: string;
  buildVariant: string;
}