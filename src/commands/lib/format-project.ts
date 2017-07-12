import { IAndroidJavaProjectDescription, IIosObjectiveCSwiftProjectDescription, IProjectDescription, IReactNativeProjectDescription } from "./models/project-description";

import { IRemoteApp } from "./models/i-remote-app";
import { MobileCenterSdkModule } from "./models/mobilecenter-sdk-module";
import { out } from "../../util/interaction";

export function reportProject(projectDescriptions: (IProjectDescription & IRemoteApp)[], sdkModules: MobileCenterSdkModule, sdkVersion: string): void {
  out.text("");
  out.text("We have finished collecting all neccessary info.");
  out.text("Here is a short summary:");

  const data: string[][] = [];
  for (const projectDescription of projectDescriptions) {
    if (!projectDescription) {
      continue;
    }

    data.push(["Mobile Center App:", `${projectDescription.ownerName}/${projectDescription.appName}`]);
    data.push(["App Secret:", projectDescription.appSecret]);
    data.push(["OS:", projectDescription.os]);
    data.push(["Platform:", projectDescription.platform]);
    data.push(["SDK Version:", sdkVersion]);

    switch (projectDescription.os.toLowerCase()) {
      case "android":
        switch (projectDescription.platform.toLowerCase()) {
          case "react-native":
            const reactNativeProject = projectDescription as IReactNativeProjectDescription;
            data.push(["Project path:", reactNativeProject.reactNativeProjectPath]);
          case "java":
            const androidJavaProject = projectDescription as IAndroidJavaProjectDescription;
            data.push(["Gradle Module:", androidJavaProject.moduleName]);
            data.push(["Build Variant:", androidJavaProject.buildVariant]);
            break;
        }
        break;

      case "ios":
        switch (projectDescription.platform.toLowerCase()) {
          case "react-native":
            const reactNativeProject = projectDescription as IReactNativeProjectDescription;
            data.push(["Project path:", reactNativeProject.reactNativeProjectPath]);
          case "objective-c-swift":
            const iOsProject = projectDescription as IIosObjectiveCSwiftProjectDescription;
            data.push(["Project/Workspace path:", iOsProject.projectOrWorkspacePath]);
            //data.push(["Podfile path:", iOsProject.podfilePath]);
            break;
        }
        break;

      default:
        break;
    }
  }

  data.push(["SDK(s) to integrate:", getSdks(sdkModules)]);

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