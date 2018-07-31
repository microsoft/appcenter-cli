import { Command, CommandArgs, CommandResult,
         help, success, shortName, longName, required, hasArg, failure, ErrorCodes } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { parseTestParameters } from "./parameters-parser";
import { processIncludedFiles } from "./included-files-parser";
import { progressWithResult } from "./interaction";
import { ITestCloudManifestJson } from "./test-manifest-reader";
import { Messages } from "./help-messages";
import * as _ from "lodash";
import * as pfs from "../../../util/misc/promisfied-fs";

export class PrepareTestsCommand extends Command {

  @help(Messages.TestCloud.Arguments.PrepareArtifactsDir)
  @longName("artifacts-dir")
  @hasArg
  @required
  artifactsDir: string;

  @help(Messages.TestCloud.Arguments.Include)
  @longName("include")
  @hasArg
  include: string[];

  @help(Messages.TestCloud.Arguments.TestParameter)
  @longName("test-parameter")
  @shortName("p")
  @hasArg
  testParameters: string[];

  constructor(args: CommandArgs) {
    super(args);

    if (typeof this.testParameters === "string") {
      this.testParameters = [ this.testParameters ];
    }

    if (typeof this.include === "string") {
      this.include = [ this.include ];
    }
  }

  // Override this if you need to validate options
  protected async validateOptions(): Promise<void> {
    return;
  }

  // TODO: There is technical debt here.
  // There is a lot of confusion and even duplicated code with respect to test params,
  // included files and responsibility of prepare vs run.
  public async runNoClient(): Promise<CommandResult> {
    try {
      await this.validateOptions();
      const manifestPath = await progressWithResult("Preparing tests", this.prepareManifest());
      await this.addIncludedFilesAndTestParametersToManifest(manifestPath);
      out.text(this.getSuccessMessage(manifestPath));

      return success();
    } catch (err) {
      return failure(ErrorCodes.Exception, err.message);
    }
  }

  private async addIncludedFilesAndTestParametersToManifest(manifestPath: string): Promise<void> {
    const manifestJson = await pfs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestJson) as ITestCloudManifestJson;

    await this.addIncludedFiles(manifest);
    await this.addTestParameters(manifest);

    const modifiedJson = JSON.stringify(manifest, null, 1);
    await pfs.writeFile(manifestPath, modifiedJson);
  }

  protected async addIncludedFiles(manifest: ITestCloudManifestJson) {
    await processIncludedFiles(manifest, this.include, this.artifactsDir, this.getSourceRootDir());
  }

  protected async addTestParameters(manifest: ITestCloudManifestJson): Promise<void> {
    if (!this.testParameters) {
      return;
    }

    const parsedParameters = parseTestParameters(this.testParameters);
    _.merge(manifest.testFramework.data, parsedParameters || {});
  }

  protected prepareManifest(): Promise<string> {
    throw new Error("prepareManifest method must be overriden in derived classes");
  }

  protected getSuccessMessage(manifestPath: string) {
    return `Tests are ready to run. Manifest file was written to ${manifestPath}`;
  }

  protected getSourceRootDir(): string {
    throw new Error("getSourceRootDir method must be overriden in derived classes");
  }
}
