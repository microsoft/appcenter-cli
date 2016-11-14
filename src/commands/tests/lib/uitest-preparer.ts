import { TestCloudError } from "./test-cloud-error";
import * as path from "path";
import * as process from "../../../util/misc/process-helper";

const debug = require("debug")("mobile-center:commands:test");

export class UITestPreparer {
  private readonly appPath: string;
  private readonly assemblyDir: string;
  private readonly artifactsDir: string;

  public storeFile: string;
  public storePassword: string;
  public keyAlias: string;
  public keyPassword: string;
  public signInfo: string;
  public include: string[];
  public testParameters: string[];

  constructor(artifactsDir: string, assemblyDir: string, appPath: string) {
    if (!artifactsDir) {
      throw new Error("Argument artifactsDir is required");
    }
    if (!assemblyDir) {
      throw new Error("Argument assemblyDir is required");
    }
    if (!appPath) {
      throw new Error("Argument appPath is required");
    }

    this.appPath = appPath;
    this.assemblyDir = assemblyDir;
    this.artifactsDir = artifactsDir;
  }

  public async prepare(): Promise<string> {
    this.validateArguments();

    let command = this.getPrepareCommand();
    debug(`Executing command ${command}`);
    let exitCode = await process.execAndWait(command);

    if (exitCode !== 0) {
      throw new TestCloudError("Cannot prepare UI Test artifacts. Please inspect logs for more details", exitCode);
    }
    
    return path.join(this.artifactsDir, "manifest.json");
  }

  private validateArguments() {
    if (this.storeFile || this.storePassword || this.keyAlias || this.keyPassword) {
      if (!(this.storeFile && this.storePassword && this.keyAlias && this.keyPassword)) {
        throw new Error("If keystore is used, all of the following arguments must be set: --store-file, --store-password, --key-alias, --key-password");
      }
    }
  }

  private getPrepareCommand(): string {
    let command = `test-cloud prepare "${this.appPath}"`;

    if (this.storeFile) {
      command += ` "${this.storeFile}" "${this.storePassword}" "${this.keyAlias}" "${this.keyPassword}"`;
    }

    command += ` --assembly-dir "${this.assemblyDir}" --artifacts-dir "${this.artifactsDir}"`;

    for (let i = 0; i < this.testParameters.length; i++) {
      command += ` --test-parameter "${this.testParameters[i]}"`;
    }

    for (let i = 0; i < this.include.length; i++) {
      command += ` --include "${this.include[i]}"`;
    }

    if (this.signInfo) {
      command += ` --sign-info "${this.signInfo}"`;
    }

    return command;
  }
}