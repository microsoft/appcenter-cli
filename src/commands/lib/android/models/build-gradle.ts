import { ISnippet } from './../../models/i-snippet';

export interface IBuildGradle {
  path: string;
  contents: string;
  buildVariants: IBuildVariant[];
  sourceSets: ISourceSet[];
  
  dependenciesBlocks: IDependenciesBlock[]
}

export interface IBuildVariant {
  name: string;
  buildType: string;
  productFlavors?: string[];
}

export interface ISourceSet {
  name: string;
  manifestSrcFile?: string;
  javaSrcDirs?: string[];
}

export interface IDependenciesBlock extends ISnippet {
  modifiedText?: string;

  defs: IDefDeclaration[];
  compiles: ICompileDeclaration[];
}

export interface IDefDeclaration extends ISnippet {
  name: string;
  value: string;
}

export interface ICompileDeclaration extends ISnippet {
  moduleName: string;
}