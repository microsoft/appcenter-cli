import { TestCloudError } from "./test-cloud-error";
import { parseTestParameter } from "./parameters-parser";
import * as path from "path";
import * as process from "../../../util/misc/process-helper";
import { out } from "../../../util/interaction";

const debug = require("debug")("appcenter-cli:commands:test:lib:calabash-preparer");

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
    let exitCode = await process.execAndWait(command, this.outMessage, this.outMessage);

    if (exitCode !== 0) {
      throw new TestCloudError(`Cannot prepare Calabash artifacts. Returning exit code ${exitCode}.`, exitCode);
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
      command += ` --test-params ${this.generateTestParameterArgs()}`;
    }

    return command;
  }

  private generateTestParameterArgs(): string {
    let result: string = "";

    if (this.testParameters) {
      this.testParameters.forEach(p => {
        let parsedParameter = parseTestParameter(p);
        if (result != "") {
          result += ",";
        }
        result += `${parsedParameter.key}:`;
        if (parsedParameter.value != null) {
          result += `${parsedParameter.value}`;
        }
      });
    }

    return result;
  }

  /*
   The Calabash `test-cloud prepare` command uses different argument names than the AooCenter CLI.
   We cannot easily change that: the `test-cloud prepare` uses argument names that are consistent with other
   `test-cloud` commands, while the `appcenter test run calabash` uses argument names that are consistent with
   other AppCenter CLI commands.

   As a result, user who uses AppCenter CLI will see misleading error messages, such as:
    `The --profile option was set without a --config option.`

   However, when user tries again with the --config option, he will see another error message, since the correct name
   for AppCenter CLI is `--config-path`.

   The easiest way to make the experience better is to translate the messages.
  */
  private outMessage(line: string) {
    let translatedCalabashMessage = line.replace("--config ", "--config-path ");
    out.text(translatedCalabashMessage);
  }
}