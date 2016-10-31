import { Command, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn } from "../../util/commandLine";
import { out } from "../../util/interaction";
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

const debug = require("debug")("somona-cli:commands:submit-tests");

@help("Submits tests to Sonoma")
export default class SubmitTestsCommand extends Command {
  @help("Application name")
  @shortName("an")
  @longName("app-name")
  @hasArg
  @required
  applicationName: string;

  @help("Application file path")
  @shortName("ap")
  @longName("app-path")
  @hasArg
  @required
  applicationPath: string;

  @help("Selected devices slug")
  @shortName("d")
  @longName("devices")
  @hasArg
  @required
  devices: string;

  @help("Path to manifest file")
  @shortName("m")
  @longName("manifest-path")
  @hasArg
  @required
  manifestPath: string;

  @help("Path to dSym files")
  @shortName("s")
  @longName("dsym-path")
  @hasArg
  dSymPath: string;

  @help("Test parameters")
  @shortName("p")
  @longName("test-parameter")
  @hasArg
  testParameters: string[];

  @help("Locale of the test run")
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
    debug("Validating application file");
    await AppValidator.validate(this.applicationPath);
    
    debug("Parsing manifest");
    let manifest = await TestManifestReader.readFromFile(this.manifestPath);
    let appFile = await TestRunFile.create(this.applicationPath, path.basename(this.applicationPath), "app-file");

    debug("Creating new TestRun");
    let testRunId = await this.createTestRun(client);
    out.text(`Test run id: ${testRunId}`);

    debug("Uploading app file");

    this.uploadHashOrNewFile(client, testRunId, appFile);
    for (let i = 0; i < manifest.files.length; i++) {
      await this.uploadHashOrNewFile(client, testRunId, manifest.files[i]);
    }
    
    await this.startTestRun(client, testRunId, manifest);

    return success();
  }

  private createTestRun(client: SonomaClient): Promise<string> {
     return new Promise<string>((resolve, reject) => {
       client.test.createTestRun(
         getUser().userName, 
         this.applicationName, 
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
      out.text(`File ${file.sourcePath}: hash upload`);
    }
    else {
      await this.uploadFile(client, testRunId, file);
      out.text(`File ${file.sourcePath}: direct upload`);
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
        this.applicationName,
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
        this.applicationName,
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

  private startTestRun(client: SonomaClient, testRunId: string, manifest: TestManifest): Promise<void> {
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
        this.applicationName,
        cb);
    });
  }

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
}