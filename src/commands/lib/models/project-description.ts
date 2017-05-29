export type IProjectDescription = IAndroidJavaProjectDescription | IIosObjectiveCSwiftProjectDescription | IReactNativeProjectDescription;

export interface IAndroidJavaProjectDescription {
  moduleName: string;
  buildVariant: string;
}

export interface IIosObjectiveCSwiftProjectDescription {
  podfilePath: string;
  projectOrWorkspacePath: string;
}

export interface IReactNativeProjectDescription {
  reactNativeProjectPath: string;
}