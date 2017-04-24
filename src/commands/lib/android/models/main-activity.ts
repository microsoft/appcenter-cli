import { ISnippet } from "../../models/i-snippet";
import { MobileCenterSdkModule } from "../../models/mobilecenter-sdk-module";

export interface IMainActivity {
  path: string;
  contents: string;
  name: string;
  fullName: string;

  importStatements: IImportStatement[];
  startSdkStatement: IStartSdkStatement;
}

export interface IImportStatement extends ISnippet {
  module: MobileCenterSdkModule;
}

export interface IStartSdkStatement extends ISnippet {
  modules: MobileCenterSdkModule;
}