import { models } from "../../util/apis/index";

export function getProjectDescription(branchConfig: models.BranchConfiguration): ProjectDescription {
  
  if (branchConfig.toolsets.android) {
    return {
      moduleName: branchConfig.toolsets.android.module,
      buildVariant: branchConfig.toolsets.android.buildVariant
    }
  }
  if (branchConfig.toolsets.xcode) {
    return {
      projectOrWorkspacePath: branchConfig.toolsets.xcode.projectOrWorkspacePath,
      podfilePath: branchConfig.toolsets.xcode.podfilePath
    }
  }
  
  throw new Error("Unsupported OS/Platform");
}

export type ProjectDescription = IAndroidJavaProjectDescription | IIosObjectiveCSwiftProjectDescription;

export interface IAndroidJavaProjectDescription {
  moduleName: string;
  buildVariant: string;
}

export interface IIosObjectiveCSwiftProjectDescription {
  podfilePath: string;
  projectOrWorkspacePath: string;
}