import { Command, CommandArgs, CommandResult,
         help, success, name, shortName, longName, required, hasArg,
         position, failure, notLoggedIn, ErrorCodes } from "../../../util/commandline";
import { out } from "../../../util/interaction";
import { parseTestParameters } from "./parameters-parser";
import { parseIncludedFiles } from "./included-files-parser";
import { progressWithResult } from "./interaction";
import { ITestCloudManifestJson, ITestFrameworkJson, IFileDescriptionJson } from "./test-manifest-reader";
import { Messages } from "./help-messages";
import * as _ from "lodash";
import * as path from "path";
import * as pfs from "../../../util/misc/promisfied-fs";

export class PrepareTestsCommand extends Command {

  @help(Messages.TestCloud.Arguments.PrepareArtifactsDir)
  @longName("artifacts-dir")
  @hasArg
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

  public async runNoClient(): Promise<CommandResult> {
    try {
      let manifestPath = await progressWithResult("Preparing tests", this.prepareManifest());
      await this.addIncludedFilesAndTestParametersToManifest(manifestPath);
      out.text(this.getSuccessMessage(manifestPath));

      return success();
    }
    catch (err) {
      return failure(ErrorCodes.Exception, err.message);
    }
  }

  private async addIncludedFilesAndTestParametersToManifest(manifestPath: string): Promise<void> {
    let manifestJson = await pfs.readFile(manifestPath, "utf8");
    let manifest = JSON.parse(manifestJson) as ITestCloudManifestJson;

    await this.addIncludedFiles(manifest);
    await this.addTestParameters(manifest);

    let modifiedJson = JSON.stringify(manifest, null, 1);
    await pfs.writeFile(manifestPath, modifiedJson);
  }

  protected async addIncludedFiles(manifest: ITestCloudManifestJson): Promise<void> {
    if (!this.include) {
      return;
    }

    let includedFiles = parseIncludedFiles(this.include, this.getSourceRootDir());
    for (let i = 0; i < includedFiles.length; i++) {
      let includedFile = includedFiles[i];
      let copyTarget = path.join(this.artifactsDir, includedFile.targetPath);
      await pfs.cp(includedFile.sourcePath, copyTarget);

      manifest.files.push(includedFile.targetPath);
    }
  }

  protected async addTestParameters(manifest: ITestCloudManifestJson): Promise<void> {
    if (!this.testParameters) {
      return;
    }

    let parsedParameters = parseTestParameters(this.testParameters);
    _.merge(manifest.testFramework.data, parsedParameters || {});
  }

  protected prepareManifest(): Promise<string> {
    throw new Error("This method must be overriden in derived classes");
  }

  protected getSuccessMessage(manifestPath: string) {
    return `Tests are ready to run. Manifest file was written to ${manifestPath}`;
  }

  protected getSourceRootDir(): string {
    throw new Error("This method must be overriden in derived classes");
  }
}