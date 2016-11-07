import { AppCommand, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn } from "../../util/commandLine";
import { out } from "../../util/interaction";
import * as outExtensions from "./lib/interaction";
import { getUser } from "../../util/profile";
import { SonomaClient, models, clientCall } from "../../util/apis";
import { PathResolver } from "./lib/path-resolver";
import { TestManifest, TestRunFile } from "./lib/test-manifest";
import { TestManifestReader } from "./lib/test-manifest-reader";
import { AppValidator } from "./lib/app-validator";
import * as path from "path";
import * as fs from "fs";
import * as http from 'http';
import * as _ from "lodash";
import * as url from "url";
import * as request from "request";

const pLimit = require("p-limit");
const debug = require("debug")("somona-cli:commands:submit-tests");
const paralleRequests = 10;

@help("Submits tests to Visual Studio Mobile Center")
export default class RunTestsCommand extends AppCommand {
  @help("Application file path")
  @longName("app-path")
  @hasArg
  @required
  applicationPath: string;

  @help("Selected devices slug")
  @longName("devices")
  @hasArg
  @required
  devices: string;

  @help("Path to manifest file")
  @longName("manifest-path")
  @hasArg
  @required
  manifestPath: string;

  @help("Path to dSym files")
  @longName("dsym-path")
  @hasArg
  dSymPath: string;

  @help("Test parameters")
  @shortName("p")
  @longName("test-parameter")
  @hasArg
  testParameters: string[];

  @help("Locale for the test run (e.g. en-US)")
  @longName("locale")
  @hasArg
  locale: string;

  @help("Test series name")
  @longName("test-series")
  @hasArg
  testSeries: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: SonomaClient): Promise<CommandResult> {
    let manifest = await outExtensions.progressWithResult<TestManifest>(
      "Validating arguments", 
      this.validateAndParseManifest());
    
    let appFile = await TestRunFile.create(this.applicationPath, path.basename(this.applicationPath), "app-file");

    let testRunId = await outExtensions.progressWithResult(
      "Creating new test run", 
      this.createTestRun(client));
    debug(`Test run id: ${testRunId}`);

    await outExtensions.progressWithResult(
      "Uploading application file", 
      this.uploadHashOrNewFile(client, testRunId, appFile));
    
    await outExtensions.progressWithResult(
      "Uploading test files", 
      this.uploadAllTestFiles(client, testRunId, manifest.files));

    let startRunResult = await outExtensions.progressWithResult("Starting test run", this.startTestRun(client, testRunId, manifest));

    out.text(`Test run id: "${testRunId}"`);
    out.text("Accepted devices: ");
    out.list(item => `  - ${item}`, startRunResult.acceptedDevices);
    
    if (startRunResult.rejectedDevices && startRunResult.rejectedDevices.length > 0) {
      out.text("Rejected devices: ");
      out.list(item => `  - ${item}`, startRunResult.rejectedDevices);
    }
    
    return success();
  }

  private async validateAndParseManifest(): Promise<TestManifest> {
    await AppValidator.validate(this.applicationPath);
    
    return await TestManifestReader.readFromFile(this.manifestPath);
  };

 private createTestParameters(): any {
    let result: any = {};
    if (this.testParameters) {
      if (typeof this.testParameters === "string") {
        this.testParameters = [this.testParameters];
      }
      this.testParameters.forEach(p => {
        let parsedParameter = this.parseTestParameter(p);
        result[parsedParameter.key] = result[parsedParameter.value];
      });
    }
    return result;
  }

  private parseTestParameter(testParameter: string) {
    let colonIndex = testParameter.indexOf(":");
    if (colonIndex !== -1) {
      return {
        key: testParameter.substr(0, colonIndex),
        value: testParameter.substr(colonIndex + 1, testParameter.length - colonIndex - 1)
      }
    }
    else {
      return {
        key: testParameter,
        value: null
      }
    }
  }

  private uploadAllTestFiles(client: SonomaClient, testRunId: string, files: TestRunFile[]): Promise<void> {
    let limit = pLimit(paralleRequests);
    let uploadTasks = files.map(f => limit(() => this.uploadHashOrNewFile(client, testRunId, f)));

    return Promise.all(uploadTasks);
  }

  private createTestRun(client: SonomaClient): Promise<string> {
     return new Promise<string>((resolve, reject) => {
       client.test.createTestRun(
         getUser().userName, 
         this.app.appName, 
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

  private async uploadHashOrNewFile(client: SonomaClient, testRunId: string, file: TestRunFile): Promise<void> {
    if (await this.tryUploadFileHash(client, testRunId, file)) {
      debug(`File ${file.sourcePath}: hash upload`);
    }
    else {
      await this.uploadFile(client, testRunId, file);
      debug(`File ${file.sourcePath}: direct upload`);
    }
  }

  private async tryUploadFileHash(client: SonomaClient, testRunId: string, file: TestRunFile, byteRange: string = null): Promise<boolean> {
    let response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      client.test.uploadHash(
        testRunId, 
        {
          checksum: file.sha256,
          fileType: file.fileType,
          relativePath: file.targetRelativePath,
          byteRange: byteRange
        },
        getUser().userName,
        this.app.appName,
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
      return await this.tryUploadFileHash(client, testRunId, file, "TODO");
    }
    else {
      return false;
    } 
  }

  private async uploadFile(client: SonomaClient, testRunId: string, file: TestRunFile): Promise<void> {
    let directUrl = await this.getDirectUploadUrl(client, testRunId, file);
    await this.makeDirectUpload(directUrl, file);
  }

  private getDirectUploadUrl(client: SonomaClient, testRunId: string, file: TestRunFile): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      client.test.startUploadingFile(
        testRunId,
        getUser().userName,
        this.app.appName,
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

  private startTestRun(client: SonomaClient, testRunId: string, manifest: TestManifest): Promise<models.TestCloudStartTestRunResult> {
    let startOptions: models.TestCloudStartTestRunOptions = {
      testFramework: manifest.testFramework.name,
      deviceSelection: this.devices,
      locale: this.locale,
      testSeries: this.testSeries,
      testParameters: this.createTestParameters()
    };

    return clientCall(cb => {
      client.test.startTestRun(
        testRunId, 
        startOptions,
        getUser().userName,
        this.app.appName,
        cb);
    });
  }

  private getTestRunState(client: SonomaClient, testRunId: string): Promise<any> {
    return clientCall(cb => {
      client.test.getTestRunState(
        testRunId,
        getUser().userName,
        this.app.appName,
        cb
      );
    });
  }
}