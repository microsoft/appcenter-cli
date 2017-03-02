import { TestCloudError } from "./test-cloud-error";
import { parseTestParameter } from "./parameters-parser";
import * as path from "path";
import * as process from "../../../util/misc/process-helper";

const debug = require("debug")("mobile-center-cli:commands:test:lib:calabash-preparer");

export class CalabashPreparer {
  private readonly appPath: string;
  private readonly projectDir: string;
  private readonly artifactsDir: string;
  private readonly testParameters: string[];

  public signInfo: string;
  public config: string;
  public profile: string;
  public skipConfigCheck: boolean;

  constructor(artifactsDir: string, projectDir: string, appPath: string, testParameters: string[]) {
    if (!artifactsDir) {
      throw new Error("Argument artifactsDir is required");
    }
    if (!projectDir) {
      throw new Error("Argument projectDir is required");
    }
    if (!appPath) {
      throw new Error("Argument appPath is required");
    }

    this.artifactsDir = artifactsDir;
    this.projectDir = projectDir;
    this.appPath = appPath;
    this.testParameters = testParameters;
  }

  public async prepare(): Promise<string> {
    let command = this.getPrepareCommand();
    debug(`Executing command ${command}`);
    let exitCode = await process.execAndWait(command);

    if (exitCode !== 0) {
      throw new TestCloudError("Cannot prepare Calabash artifacts. Please inspect logs for more details", exitCode);
    }

    return path.join(this.artifactsDir, "manifest.json");
  }

  private getPrepareCommand(): string {
    let command = `test-cloud prepare ${this.appPath} --artifacts-dir ${this.artifactsDir}`;
    command += ` --workspace "${this.projectDir}"`;

    if (this.config) {
      command += ` --config "${this.config}"`;
    }
    if (this.profile) {
      command += ` --profile "${this.profile}"`;
    }
    if (this.skipConfigCheck) {
      command += " --skip-config-check";
    }
    if (this.signInfo) {
      command += ` --sign-info "${this.signInfo}"`;
    }

    if (this.testParameters && this.testParameters.length > 0) {
      command += ` --test-parameters ${this.generateTestParameterArgs()}`;
    }

    return command;
  }

  private generateTestParameterArgs(): string {
    let result: string = "";
  
    if (this.testParameters) {
      this.testParameters.forEach(p => {
        let parsedParameter = parseTestParameter(p);
        if (result != "") {
          result += " ";
        }
        result += `${parsedParameter.key}:`;
        if (parsedParameter.value != null) {
          result += `${parsedParameter.value}`;
        }
      });
    }    

    return result;
  }
}