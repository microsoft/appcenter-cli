import { SonomaClient, models, clientCall } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { progressWithResult } from "./interaction";
import { TestManifest, TestRunFile } from "./test-manifest";
import { TestManifestReader } from "./test-manifest-reader";
import { AppValidator } from "./app-validator";
import * as _ from "lodash";
import * as fs from "fs";
import * as http from 'http';
import * as path from "path";
import * as request from "request";

const debug = require("debug")("mobile-center:commands:test");
const pLimit = require("p-limit");
const paralleRequests = 10;

export interface StartedTestRun {
  testRunId: string;
  acceptedDevices: string[];
  rejectedDevices: string[];
}

export class TestCloudUploader {
  private readonly _client: SonomaClient;
  private readonly _userName: string;
  private readonly _appName: string;
  private readonly _manifestPath: string;
  private readonly _devices: string;
    
  public appPath: string;
  public dSymPath: string;
  public testParameters: { [key:string]: any };
  public testSeries: string;
  public locale: string;

  constructor(client: SonomaClient, userName: string, appName: string, manifestPath: string, devices: string) {
    if (!client) {
      throw new Error("Argument client is required");
    }
    if (!userName) {
      throw new Error("Argument userName is required");
    }
    if (!appName) {
      throw new Error("Argument appName is required");
    }
    if (!manifestPath) {
      throw new Error("Argument manifestPath is required");
    }
    if (!devices) {
      throw new Error("Argument devices is required");
    }

    this._client = client;
    this._manifestPath = manifestPath;
    this._devices = devices;
    this._userName = userName;
    this._appName = appName;
  }

  public async uploadAndStart(): Promise<StartedTestRun> {
    let manifest = await progressWithResult<TestManifest>(
      "Validating argumetns",
      this.validateAndParseManifest());
    
    let testRunId = await progressWithResult("Creating new test run", this.createTestRun());
    debug(`Test run id: ${testRunId}`);

    let appFile = await TestRunFile.create(this.appPath, path.basename(this.appPath), "app-file");
    await progressWithResult("Uploading application file", this.uploadHashOrNewFile(testRunId, appFile));
    await progressWithResult("Uploading test files", this.uploadAllTestFiles(testRunId, manifest.testFiles));

    let startResult = await progressWithResult("Starting test run", this.startTestRun(testRunId, manifest));

    return {
      acceptedDevices: startResult.acceptedDevices || [], 
      rejectedDevices: startResult.rejectedDevices || [],
      testRunId: testRunId
    };
  }

  private async validateAndParseManifest(): Promise<TestManifest> {
    await AppValidator.validate(this.appPath);
    
    return await TestManifestReader.readFromFile(this._manifestPath);
  };

  private createTestRun(): Promise<string> {
     return new Promise<string>((resolve, reject) => {
       this._client.test.createTestRun(
         this._userName,
         this._appName, 
         (err: Error, _result: any, _request: any, response: http.IncomingMessage) => {
          if (err) { 
            reject(err); 
          }
          else {
            let location: string = response.headers["location"];
            let testRunId = _.last(location.split("/"));
            resolve(testRunId); 
          }
      });
    });
  }

  private async uploadHashOrNewFile(testRunId: string, file: TestRunFile): Promise<void> {
    if (await this.tryUploadFileHash(testRunId, file)) {
      debug(`File ${file.sourcePath}: hash upload`);
    }
    else {
      await this.uploadFile(testRunId, file);
      debug(`File ${file.sourcePath}: direct upload`);
    }
  }

  private async tryUploadFileHash(testRunId: string, file: TestRunFile, byteRange: string = null): Promise<boolean> {
    let response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      this._client.test.uploadHash(
        testRunId, 
        {
          checksum: file.sha256,
          fileType: file.fileType,
          relativePath: file.targetRelativePath,
          byteRange: byteRange
        },
        this._userName,
        this._appName,
        (err, result, request, response) => {
          if (err) {
            reject(err);
          }
          else {
            resolve(response);
          }
        })
    });

    if (response.statusCode === 201) {
      return true;
    }
    else if (response.statusCode === 401 && !byteRange) {
      return await this.tryUploadFileHash(testRunId, file, "TODO");
    }
    else {
      return false;
    } 
  }

  private async uploadFile(testRunId: string, file: TestRunFile): Promise<void> {
    let directUrl = await this.getDirectUploadUrl(this._client, testRunId, file);
    await this.makeDirectUpload(directUrl, file);
  }

  private getDirectUploadUrl(client: SonomaClient, testRunId: string, file: TestRunFile): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      client.test.startUploadingFile(
        testRunId,
        this._userName,
        this._appName,
        (err, _result, _request, response) => {
          if (err) {
            reject(err);
          }
          else {
            let location: string = response.headers["location"];
            resolve(location);
          }
        }
      );
    });
  }

  private async makeDirectUpload(directUrl: string, file: TestRunFile): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        let formData = {
          relative_path: file.targetRelativePath,
          file: fs.createReadStream(file.sourcePath),
          file_type: file.fileType
        };

        request.post({
            url: directUrl,
            formData: formData
          },
          (err, response, body) => {
            if (err) {
              reject(err);
            }
            else if (response.statusCode >= 400) {
              reject(new Error(`Cannot upload file. Response: ${response.statusCode}; Message: ${body}`));              
            }
            else {
              resolve();
            }
          }
        );
      }
      catch (err) {
        reject(err);
      }
    });
  }

  private uploadAllTestFiles(testRunId: string, files: TestRunFile[]): Promise<void> {
    let limit = pLimit(paralleRequests);
    let uploadTasks = files.map(f => limit(() => this.uploadHashOrNewFile(testRunId, f)));

    return Promise.all(uploadTasks);
  }

  private startTestRun(testRunId: string, manifest: TestManifest): Promise<models.TestCloudStartTestRunResult> {
    let allTestParameters = _.merge(manifest.testFramework.data || { }, this.testParameters || { });

    let startOptions: models.TestCloudStartTestRunOptions = {
      testFramework: manifest.testFramework.name,
      deviceSelection: this._devices,
      locale: this.locale,
      testSeries: this.testSeries,
      testParameters: this.testParameters
    };

    return clientCall(cb => {
      this._client.test.startTestRun(
        testRunId, 
        startOptions,
        this._userName,
        this._appName,
        cb);
    });
  }
}