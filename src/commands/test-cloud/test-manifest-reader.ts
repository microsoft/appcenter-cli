import { TestFile, TestFrameworkData, TestCloudManifest } from "./test-manifest";
import { PathResolver } from "./path-resolver";
import * as path from "path";
import * as _ from "lodash";

export interface IFileDescriptionJson {
  sourcePath: string;
  targetPath: string;
};

export interface ITestFrameworkJson {
  name: string;
  version: string;
  data: any;
};

export interface ITestCloudManifestJson {
  schemaVersion: string;
  
  files: (string | IFileDescriptionJson)[];

  testFramework: ITestFrameworkJson;
};

export class TestManifestReader {
  private pathResolver: PathResolver;

  constructor(pathResolver: PathResolver) {
    if (!pathResolver)
      throw new Error("Argument pathResolver is required");

    this.pathResolver = pathResolver;
  }

  public async readManifest(json: ITestCloudManifestJson): Promise<TestCloudManifest> {
    let files = await this.readTestFiles(json.files);
    
    return new TestCloudManifest(
      json.schemaVersion,
      files,
      new TestFrameworkData(
        json.testFramework.name,
        json.testFramework.version,
        json.testFramework.data
      )
    );
  }

  async readTestFiles(json: (string | IFileDescriptionJson)[]): Promise<TestFile[]> {
    let resolvedPaths = { };
    let result: TestFile[] = [];
    
    let filePatterns = json.filter(f => typeof f === "string");
    let fileDescriptions = json.filter(f => typeof f !== "string");

    return _.concat<TestFile>(
      await this.readFilePatterns(filePatterns as string[]),
      await this.readFileDescriptions(fileDescriptions as IFileDescriptionJson[])
    );
  }

  async readFilePatterns(patterns: string[]): Promise<TestFile[]> {
    let filePaths = await this.pathResolver.resolve(patterns);
    
    return await Promise.all(filePaths.map(relativePath => {
      let fullPath = path.join(this.pathResolver.workspace, relativePath);
      return TestFile.create(fullPath, relativePath);
    }));
  }

  async readFileDescriptions(descriptions: IFileDescriptionJson[]): Promise<TestFile[]> {
    return await Promise.all(descriptions.map(d => this.readFileDescription(d)));
  }

  async readFileDescription(description: IFileDescriptionJson): Promise<TestFile> {
    let inputFiles = await this.pathResolver.resolve(description.sourcePath);
    if (inputFiles.length == 0) {
      throw new Error(`Pattern ${description.sourcePath} did not resolve to any existing file`);
    };
    if (inputFiles.length > 1) {
      throw new Error(`Pattern ${description.sourcePath} resolved to more than one file`);
    }

    return await TestFile.create(path.join(this.pathResolver.workspace, inputFiles[0]), description.targetPath);
  }
}