import { AppCenterClient, models, clientCall, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import { getUser } from "../../../util/profile";
import { progressWithResult } from "./interaction";
import { TestManifest, TestRunFile } from "./test-manifest";
import { TestManifestReader } from "./test-manifest-reader";
import { AppValidator } from "./app-validator";
import { parseRange, getByteRange } from "./byte-range-helper";
import { getDSymFile } from "./dsym-dir-helper";
import { getOrgsNamesList } from "../../orgs/lib/org-users-helper";
import * as PortalHelper from "../../../util/portal/portal-helper";
import * as _ from "lodash";
import * as fs from "fs";
import * as http from 'http';
import * as path from "path";
import * as request from "request";

const debug = require("debug")("appcenter-cli:commands:test:lib:test-cloud-uploader");
const pLimit = require("p-limit");
const paralleRequests = 10;

export interface StartedTestRun {
  testRunId: string;
  testRunUrl: string;
  acceptedDevices: string[];
  rejectedDevices: string[];
}

export class TestCloudUploader {
  private readonly _client: AppCenterClient;
  private readonly _userName: string;
  private readonly _appName: string;
  private readonly _manifestPath: string;
  private readonly _devices: string;
  private readonly _portalBaseUrl : string;

  public appPath: string;
  public dSymPath: string;
  public testParameters: { [key:string]: any };
  public testSeries: string;
  public language: string;
  public locale: string;

  constructor(client: AppCenterClient, userName: string, appName: string, manifestPath: string, devices: string, portalBaseUrl: string) {
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
    if (!portalBaseUrl) {
      throw new Error("Argument portalBaseUrl is required");
    }

    this._client = client;
    this._manifestPath = manifestPath;
    this._devices = devices;
    this._userName = userName;
    this._appName = appName;
    this._portalBaseUrl = portalBaseUrl;
  }

  public async uploadAndStart(): Promise<StartedTestRun> {
    let orgs = await getOrgsNamesList(this._client);
    let isOrg = false;
    for (let org of orgs) {
      if (org.name === this._userName)
      {
        isOrg = true;
      }
    }
    
    let manifest = await progressWithResult<TestManifest>(
      "Validating arguments",
      this.validateAndParseManifest());

    let testRun = await progressWithResult("Creating new test run", this.createTestRun(isOrg));
    debug(`Test run id: ${testRun.testRunId}`);

    let appFile = await progressWithResult("Validating application file", this.validateAndCreateAppFile(manifest));

    let allFiles = _.concat(manifest.testFiles, [appFile]);

    if (this.dSymPath) {
      let dSymFile = await progressWithResult("Validating DSym file", getDSymFile(this.dSymPath));
      allFiles.push(dSymFile);
    }

    await progressWithResult("Uploading files", this.uploadFilesUsingBatch(testRun.testRunId, allFiles));

    let startResult = await progressWithResult("Starting test run", this.startTestRun(testRun.testRunId, manifest));

    testRun.acceptedDevices = startResult.acceptedDevices || [];
    testRun.rejectedDevices = startResult.rejectedDevices || [];

    return testRun;
  }

  private async validateAndParseManifest(): Promise<TestManifest> {
    return await TestManifestReader.readFromFile(this._manifestPath);
  };

  private async validateAndCreateAppFile(manifest: TestManifest): Promise<TestRunFile> {
    let result = manifest.applicationFile ?
      manifest.applicationFile
      : await TestRunFile.create(this.appPath, path.basename(this.appPath), "app-file")


    if (!result) {
      throw new Error("If test manifest doesn't contain path to application file, it must be provided using --app-path option");
    }

    await AppValidator.validate(result.sourcePath);

    return result;
  }

  private createTestRun(isOrg: boolean): Promise<StartedTestRun> {
     return new Promise<StartedTestRun>((resolve, reject) => {
       this._client.test.test.createTestRun(
         this._userName,
         this._appName,
         (err: Error, _result: any, _request: any, response: http.IncomingMessage) => {
          if (err) {
            reject(err);
          }
          else {
            let location: string = response.headers["location"];
            let testRunId = _.last(location.split("/"));
            resolve({
                acceptedDevices: [],
                rejectedDevices: [],
                testRunId: testRunId,
                testRunUrl: PortalHelper.getPortalTestLink(this._portalBaseUrl, isOrg, this._userName, this._appName, this.testSeries, testRunId)
              });
          }
      });
    });
  }

  private async uploadFilesUsingBatch(testRunId: string, files: TestRunFile[]): Promise<void> {
    let checkHashesResult = await this.uploadHashesBatch(testRunId, files.map(f => { return { file: f }; }));

    let limit = pLimit(paralleRequests);
    let uploadNewFilesTasks = checkHashesResult
      .filter(r => r.response.uploadStatus.statusCode === 412)
      .map(r => limit(() => this.uploadFile(testRunId, r.file)));

    await Promise.all(uploadNewFilesTasks);
  }

  private async uploadHashesBatch(testRunId: string, files: { file: TestRunFile, byteRange?: string }[]): Promise<{ file: TestRunFile, response: models.TestCloudFileHashResponse }[]> {
    let mappedFiles = files.map(f => this.testRunFileToFileHash(f.file, f.byteRange));

    let clientResponse = await clientRequest<models.TestCloudFileHashResponse[]>(cb => {
      this._client.test.test.uploadHashesBatch(
        this._appName,
        mappedFiles,
        this._userName,
        testRunId,
        cb);
    });

    return _.zip<any>(files, clientResponse.result).map((fr: any) => { return { file: fr[0].file, response: fr[1] }; });
  }

  private testRunFileToFileHash(file: TestRunFile, byteRange: string = null): models.TestCloudFileHash {
    return {
      checksum: file.sha256,
      fileType: file.fileType,
      relativePath: file.targetRelativePath
    };
  }

  private async uploadFile(testRunId: string, file: TestRunFile): Promise<void> {
    let directUrl = await this.getDirectUploadUrl(this._client, testRunId, file);
    await this.makeDirectUpload(directUrl, file);
  }

  private getDirectUploadUrl(client: AppCenterClient, testRunId: string, file: TestRunFile): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      client.test.test.startUploadingFile(
        this._appName,
        this._userName,
        testRunId,
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

  private startTestRun(testRunId: string, manifest: TestManifest): Promise<models.TestCloudStartTestRunResult> {
    let allTestParameters = _.merge(manifest.testFramework.data || { }, this.testParameters || { });

    let startOptions: models.TestCloudStartTestRunOptions = {
      testFramework: manifest.testFramework.name,
      deviceSelection: this._devices,
      locale: this.locale,
      language: this.language,
      testSeries: this.testSeries,
      testParameters: allTestParameters
    };

    return clientCall(cb => {
      this._client.test.test.startTestRun(
        this._appName,
        this._userName,
        startOptions,
        testRunId,
        cb);
    });
  }
}
