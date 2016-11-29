import { TestCloudError } from "./test-cloud-error";
import * as path from "path";
import * as process from "../../../util/misc/process-helper";

const debug = require("debug")("mobile-center-cli:commands:test:lib:calabash-preparer");

export class CalabashPreparer {
  private readonly appPath: string;
  private readonly projectDir: string;
  private readonly artifactsDir: string;

  public signInfo: string;
  public config: string;
  public profile: string;
  public skipConfigCheck: boolean;
  public include: string[];
  public testParameters: string[];

  constructor(artifactsDir: string, projectDir: string, appPath: string) {
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
  }

  public async prepare(): Promise<string> {
    let command = this.getPrepareCommand();
    debug(`Executing command ${command}`);
    let exitCode = await process.execAndWait(command);

    if (exitCode !== 0) {
      throw new TestCloudError("Cannot prepare UI Test artifacts. Please inspect logs for more details", exitCode);
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
      command += "--skip-config-check";
    }

    for (let i = 0; i < this.testParameters.length; i++) {
      command += ` --test-parameters "${this.testParameters[i]}"`;
    }

    for (let i = 0; i < this.include.length; i++) {
      command += ` --data "${this.include[i]}"`;
    }

    if (this.signInfo) {
      command += ` --sign-info "${this.signInfo}"`;
    }

    return command;
  }
}