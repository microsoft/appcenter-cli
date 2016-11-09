import { Command, CommandArgs, CommandResult, 
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn, ErrorCodes } from "../../../util/commandLine";
import { out } from "../../../util/interaction";
import * as outExtensions from "../lib/interaction";
import * as process from "../../../util/process/process-helper";

const debug = require("debug")("mobile-center:commands:tests:prepare");

@help("Prepares UI Test artifacts for test run")
export default class PrepareUITestCommand extends Command {
  @help("Path to an application file")
  @longName("app-path")
  @required
  @hasArg
  appPath: string;

  @help("Path to directory with test assemblies")
  @longName("assembly-dir")
  @required
  @hasArg
  assemblyDir: string;

  @help("Path to output directory with all test artifacts")
  @longName("artifacts-dir")
  @required
  @hasArg
  artifactsDir: string;

  @help("TODO")
  @longName("store-file")
  @hasArg
  storeFile: string;

  @help("TODO")
  @longName("store-password")
  @hasArg
  storePassword: string;

  @help("TODO")
  @longName("key-alias")
  @hasArg
  keyAlias: string;

  @help("TODO")
  @longName("key-password")
  @hasArg
  keyPassword: string;

  @help("Use Signing Info for signing the test server")
  @longName("sign-info")
  @hasArg
  signInfo: string;

  @help("Additional files / directories that should be included in the test run. The value should be in format 'sourceDir=targetDir'")
  @longName("include")
  @hasArg
  include: string[];

  @help("Additional test parameters that should be included in the test run. The value should be in format key=value")
  @longName("test-parameter")
  @shortName("p")
  @hasArg
  testParameters: string[];

  constructor(args: CommandArgs) {
    super(args);
    
    if (!this.testParameters) {
      this.testParameters = [];
    }
    else if (typeof this.testParameters === "string") {
      this.testParameters = [ this.testParameters ];
    }

    if (!this.include) {
      this.include = [];
    }
    else if (typeof this.include === "string") {
      this.include = [ this.include ];
    }
  }

  public async runNoClient(): Promise<CommandResult> {
    try {
      this.validateArguments();

      let command = this.getPrepareCommand();
      debug(`Executing command ${command}`);
      let exitCode = await process.execAndWait(command);

      if (exitCode === 0) {
        return success();
      }
      else {
        return failure(exitCode, "Cannot prepare UI Test artifacts. Please inspect logs for more details");
      }
    }
    catch (err) {
      return failure(ErrorCodes.Exception, err.message);
    }
  }

  private validateArguments() {
    if (this.storeFile || this.storePassword || this.keyAlias || this.keyPassword) {
      if (!(this.storeFile && this.storePassword && this.keyAlias && this.keyPassword)) {
        throw new Error("If keystore is used, all of the following arguments must be set: --store-file, --store-password, --key-alias, --key-password");
      }
    }
  }

  private getPrepareCommand(): string {
    let command = `test-cloud prepare ${this.appPath}`;

    if (this.storeFile) {
      command += ` ${this.storeFile} ${this.storePassword} ${this.keyAlias} ${this.keyPassword}`;
    }

    command += ` --assembly-dir ${this.assemblyDir} --artifacts-dir ${this.artifactsDir}`;

    for (let i = 0; i < this.testParameters.length; i++) {
      command += ` --test-params "${this.testParameters[i]}"`;
    }

    for (let i = 0; i < this.include.length; i++) {
      command += ` --data "${this.include[i]}"`;
    }

    return command;
  }
}
