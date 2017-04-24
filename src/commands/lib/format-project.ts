import { IAndroidJavaProjectDescription, IIosObjectiveCSwiftProjectDescription, ProjectDescription } from "./models/project-description";

import { IRemoteApp } from "./models/i-remote-app";
import { MobileCenterSdkModule } from "./models/mobilecenter-sdk-module";
import { out } from "../../util/interaction";

export function reportProject(app: IRemoteApp, projectDescription: ProjectDescription, sdkModules: MobileCenterSdkModule, sdkVersion: string): void {
  out.text("");
  out.text("We have finished collecting all neccessary info.");
  out.text("Here is a short summary:");

  const data: string[][] = [];
  data.push(["Mobile Center App:", `${app.ownerName}/${app.appName}`]);
  data.push(["App Secret:", app.appSecret]);
  data.push(["OS:", app.os]);
  data.push(["Platform:", app.platform]);
  data.push(["SDK Version:", sdkVersion]);
  
  switch (app.os) {
    case "Android":
      switch (app.platform) {
        case "Java":
          const androidJavaProject = projectDescription as IAndroidJavaProjectDescription;
          data.push([ "Gradle Module:", androidJavaProject.moduleName ]);
          data.push([ "Build Variant:", androidJavaProject.buildVariant ]);
          break;
      }
      break;

    case "iOS":
      switch (app.platform) {
        case "Objective-C-Swift":
          const iOsProject = projectDescription as IIosObjectiveCSwiftProjectDescription;
          data.push([ "Project/Workspace path:", iOsProject.projectOrWorkspacePath ]);
          data.push([ "Podfile path:", iOsProject.podfilePath ]);
          break;
      }
      break;

    default:
      break;
  }

  data.push([ "SDK(s) to integrate:", getSdks(sdkModules) ]);

  out.table(data);
}

function getSdks(sdkModules: MobileCenterSdkModule) {
  const flags = 4;
  const modules: string[] = [];

  for (let i=0; i<flags; i++) {
    const sdkModule = Math.pow(2, i);
    if (sdkModules & sdkModule)
      modules.push(MobileCenterSdkModule[sdkModule]);
  }
  
  return modules.join(", ");
}