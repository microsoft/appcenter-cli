import { TestRunFile, TestFrameworkData, TestManifest } from "./test-manifest";
import { PathResolver } from "./path-resolver";
import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";

export interface IFileDescriptionJson {
  sourcePath: string;
  targetPath: string;
};

export interface ITestFrameworkJson {
  name: string;
  data: any;
};

export interface ITestCloudManifestJson {
  schemaVersion: string;
  
  files: (string | IFileDescriptionJson)[];

  testFramework: ITestFrameworkJson;
};

export class TestManifestReader {
  private pathResolver: PathResolver;

  static async readFromFile(filePath: string): Promise<TestManifest> {
    let workspace = path.dirname(filePath);
    let resolver = new PathResolver(workspace);
    let readerInstance = new TestManifestReader(resolver);
    let json = TestManifestReader.readJsonFromFile(filePath);

    return await readerInstance.readManifest(json);
  } 

  private static readJsonFromFile(filePath: string): any {
    let json = fs.readFileSync(filePath, "utf8");
    return JSON.parse(json);
  }

  private constructor(pathResolver: PathResolver) {
    if (!pathResolver)
      throw new Error("Argument pathResolver is required");

    this.pathResolver = pathResolver;
  }

  public async readManifest(json: ITestCloudManifestJson): Promise<TestManifest> {
    let files = await this.readTestFiles(json.files);
    
    return new TestManifest(
      json.schemaVersion,
      files,
      new TestFrameworkData(
        json.testFramework.name,
        json.testFramework.data
      )
    );
  }

  private async readTestFiles(json: (string | IFileDescriptionJson)[]): Promise<TestRunFile[]> {
    let resolvedPaths = { };
    let result: TestRunFile[] = [];
    
    let filePatterns = json.filter(f => typeof f === "string");
    let fileDescriptions = json.filter(f => typeof f !== "string");

    return _.concat<TestRunFile>(
      await this.readFilePatterns(filePatterns as string[]),
      await this.readFileDescriptions(fileDescriptions as IFileDescriptionJson[])
    );
  }

  private async readFilePatterns(patterns: string[]): Promise<TestRunFile[]> {
    let filePaths = await this.pathResolver.resolve(patterns);
    
    return await Promise.all(filePaths.map(relativePath => {
      let fullPath = path.join(this.pathResolver.workspace, relativePath);
      return TestRunFile.create(fullPath, relativePath, "test-file");
    }));
  }

  private async readFileDescriptions(descriptions: IFileDescriptionJson[]): Promise<TestRunFile[]> {
    return await Promise.all(descriptions.map(d => this.readFileDescription(d)));
  }

  private async readFileDescription(description: IFileDescriptionJson): Promise<TestRunFile> {
    let inputFiles = await this.pathResolver.resolve(description.sourcePath);
    if (inputFiles.length == 0) {
      throw new Error(`Pattern ${description.sourcePath} did not resolve to any existing file`);
    };
    if (inputFiles.length > 1) {
      throw new Error(`Pattern ${description.sourcePath} resolved to more than one file`);
    }

    return await TestRunFile.create(
      path.join(this.pathResolver.workspace, inputFiles[0]), 
      description.targetPath, 
      "test-file");
  }
}