import * as pfs from "../../../util/misc/promisfied-fs";
import * as fs from "fs";
import * as path from "path";
import * as unzip from "unzip";
import { CommandArgs, help, name, longName, hasArg, required, ErrorCodes } from "../../../util/commandline";
import { RunTestsCommand } from "../lib/run-tests-command";
import { AppiumPreparer } from "../lib/appium-preparer";
import { parseTestParameters } from "../lib/parameters-parser";
import { parseIncludedFiles } from "../lib/included-files-parser";
import { Messages } from "../lib/help-messages";
import { JUnitXmlUtil } from "../util/junit-xml-util";
import { DOMParser } from "xmldom";

@help(Messages.TestCloud.Commands.RunAppium)
export default class RunAppiumTestsCommand extends RunTestsCommand {

  @help(Messages.TestCloud.Arguments.AppiumBuildDir)
  @longName("build-dir")
  @hasArg
  @required
  buildDir: string;

  @help(Messages.TestCloud.Arguments.MergeJUnitXml)
  @longName("merge-junit-xml")
  @hasArg
  mergeJUnitXml: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected prepareManifest(artifactsDir: string): Promise<string> {
    let preparer = new AppiumPreparer(artifactsDir, this.buildDir);
    return preparer.prepare();
  }

  protected getSourceRootDir() {
    return this.buildDir;
  }

  protected async validateOptions(): Promise<void> {
    if (!this.testOutputDir && this.mergeJUnitXml) {
      throw new Error("Argument --test-output-dir is required for argument --merge-junit-xml");
    }
  }

  protected async mergeTestArtifacts(): Promise<void> {
    if (!this.mergeJUnitXml) {
      return;
    }

    let reportPath: string = this.generateReportPath();
    if (!reportPath) {
      return;
    }

    let tempPath: string = await pfs.mkTempDir("appcenter-uitestreports")
    let pathToArchive: string = path.join(reportPath, "junit_xml_zip.zip");
    let pathToSingleReport: string = path.join(reportPath, this.mergeJUnitXml);

    return new Promise<void>((resolve,reject) => {
      let xmlUtil: JUnitXmlUtil = new JUnitXmlUtil();
      let mainXml: Document = xmlUtil.getEmptyXmlDocument();
      fs.createReadStream(pathToArchive)
        .pipe(unzip.Parse())
        .on('entry', function (entry: unzip.Entry) {
          if(entry.type === 'Directory') {
            return;
          }
          let fullPath = path.join(tempPath, entry.path);
          entry.pipe(fs.createWriteStream(fullPath).on("close", () => {

            let xml = new DOMParser().parseFromString(fs.readFileSync(fullPath, "utf-8"));

            var name: string = "unknown";
            var matches = entry.path.match("^(.*)_TEST.*");
            if (matches && matches.length > 1) {
              name = matches[1].replace(/\./gi, "_");
            }

            xmlUtil.appendToTestNameTransformation(xml, name);
            xmlUtil.removeIgnoredTransformation(xml);

            mainXml = xmlUtil.combine(mainXml, xml);
          }));
        })
        .on("close", () => {
          pfs.writeFile(pathToSingleReport, mainXml)
          .then(() => {
            resolve();
          });
        });
    });
  }
}