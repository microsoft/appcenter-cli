export type ProjectDescription = IAndroidJavaProjectDescription | IIosObjectiveCSwiftProjectDescription;

export interface IAndroidJavaProjectDescription {
  moduleName: string;
  buildVariant: string;
}

export interface IIosObjectiveCSwiftProjectDescription {
  podfilePath: string;
  projectOrWorkspacePath: string;
}