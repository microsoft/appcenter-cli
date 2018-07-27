import { CommandArgs, help, longName, required, hasArg } from "../../../util/commandline";
import { Messages } from "../lib/help-messages";
import * as path from "path";
import { writeFile, walk } from "../../../util/misc/promisfied-fs";
import { XmlUtil } from "../lib/xml-util";
import { XmlUtilBuilder } from "../lib/xml-util-builder";
import { generateAbsolutePath } from "../../../util/misc/fs-helper";
import { RunTestsDownloadResultCommand } from "../lib/run-tests-download-result-command";

@help(Messages.TestCloud.Commands.RunManifest)
export default class RunManifestTestsCommand extends RunTestsDownloadResultCommand {

  @help("Path to manifest file")
  @longName("manifest-path")
  @hasArg
  @required
  manifestPath: string;

  @help(Messages.TestCloud.Arguments.MergedFileName)
  @longName("merged-file-name")
  @hasArg
  outputXmlName: string;

  protected isAppPathRequired = false;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected async getArtifactsDir(): Promise<string> {
    return path.dirname(this.manifestPath);
  }

  protected async prepareManifest(artifactsDir: string): Promise<string> {
    return this.manifestPath;
  }

  protected async cleanupArtifactsDir(artifactsDir: string): Promise<void> {
    return;
  }

  protected getSourceRootDir() {
    return path.dirname(this.manifestPath);
  }

  protected async mergeTestArtifacts(): Promise<void> {
    if (!this.outputXmlName) {
      return;
    }

    const files: string[] = await walk(this.testOutputDir);
    const archive = files.find((file: string) => {
      return path.extname(file) === ".zip";
    });

    if (!archive) {
      throw new Error("\"test-output-dir\" doesn't contain any mergeable test results (.zip archives containing .xml documents)");
    }

    const xmlUtil: XmlUtil = XmlUtilBuilder.buildXmlUtilByString(path.basename(archive));
    const outputDir = generateAbsolutePath(this.testOutputDir);
    const pathToArchive: string = path.join(outputDir, xmlUtil.getArchiveName());
    const xml: Document = await xmlUtil.mergeXmlResults(pathToArchive);

    if (!xml) {
      throw new Error("XML merging has ended with an error");
    }

    await writeFile(path.join(outputDir, this.outputXmlName), xml);
  }
}
