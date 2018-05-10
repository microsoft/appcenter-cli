import * as pfs from "../../../util/misc/promisfied-fs";
import { XmlUtil } from "./xml-util";
import * as fs from "fs";
import * as path from "path";
import * as unzip from "unzip";
import { DOMParser } from "xmldom";

export class NUnitXmlUtil extends XmlUtil {

  async mergeXmlResults(pathToArchive: string): Promise<Document> {
    const tempPath: string = await pfs.mkTempDir("appcenter-uitestreports");
    let mainXml: Document = null;

    const self = this;
    return new Promise<Document>((resolve, reject) => {
      fs.createReadStream(pathToArchive)
        .pipe(unzip.Parse())
        .on("entry", function (entry: unzip.Entry) {
          const fullPath = path.join(tempPath, entry.path);
          entry.pipe(fs.createWriteStream(fullPath).on("close", () => {
            const xml = new DOMParser().parseFromString(fs.readFileSync(fullPath, "utf-8"));

            let name: string = "unknown";
            const matches = entry.path.match("^(.*)[_-]nunit[_-]report");
            if (matches && matches.length > 1) {
              name = matches[1].replace(/\./gi, "_");
            }

            self.appendToTestNameTransformation(xml, `_${name}`);
            self.removeIgnoredTransformation(xml);
            self.removeEmptySuitesTransformation(xml);

            if (mainXml) {
              mainXml = self.combine(mainXml, xml);
            } else {
              mainXml = xml;
            }
          }));
        })
        .on("close", () => {
          resolve(mainXml);
        });
    });
  }

  public getArchiveName(): string {
    return "nunit_xml_zip.zip";
  }

  combine(xml1: Document, xml2: Document): Document {
    this.combineTestResultsAttribute(xml1, xml2, "total");
    this.combineTestResultsAttribute(xml1, xml2, "errors");
    this.combineTestResultsAttribute(xml1, xml2, "failures");
    this.combineTestResultsAttribute(xml1, xml2, "not-run");
    this.combineTestResultsAttribute(xml1, xml2, "inconclusive");
    this.combineTestResultsAttribute(xml1, xml2, "ignored");
    this.combineTestResultsAttribute(xml1, xml2, "skipped");
    this.combineTestResultsAttribute(xml1, xml2, "invalid");

    const testSuitesParent: Node = this.collectAllElements(xml1, "test-results")[0];
    const testSuites: Node[] = this.collectChildren(xml2, "test-suite");

    testSuites.forEach((child: Node) => {
      testSuitesParent.appendChild(child);
    });

    return xml1;
  }

  appendToTestNameTransformation(xml: Document, text: string): void {
    const testCases: Node[] = this.collectAllElements(xml, "test-case");
    testCases.forEach((testCase: Node) => {
      const name: Attr = testCase.attributes.getNamedItem("name");
      if (name) {
        name.value = `${name.value}${text}`;
      }
    });
  }

  removeIgnoredTransformation(xml: Document): void {
    const testResults: Node[] = this.collectAllElements(xml, "test-results");
    testResults.forEach((testResult: Node) => {
      const ignoredAttr: Attr = testResult.attributes.getNamedItem("ignored");
      if (ignoredAttr) {
        const notRunAttr: Attr = testResult.attributes.getNamedItem("not-run");
        if (notRunAttr) {
          const notRun = Number(notRunAttr.value);
          const ignored = Number(ignoredAttr.value);
          notRunAttr.value = String(notRun - ignored);
        }
        ignoredAttr.value = "0";
      }
    });

    const nodes: Node[] = this.collectAllElements(xml, "test-case");
    nodes.forEach((node: Node) => {
      const resultAttr = node.attributes.getNamedItem("result");
      if (resultAttr && resultAttr.value === "Ignored") {
        node.parentNode.removeChild(node);
      }
    });
  }

  removeEmptySuitesTransformation(xml: Document): void {
    const nodes: Node[] = this.collectAllElements(xml, "test-suite");
    nodes.forEach((node: Node) => {
      if (this.countChildren(node) <= 1) {
        node.parentNode.removeChild(node);
      }
    });
  }

  combineTestResultsAttribute(xml1: Document, xml2: Document, attributeName: string) {
    this.addTestResultsAttribute(xml1, attributeName, this.getTestResultsAttribute(xml2, attributeName));
  }

  getTestResultsAttribute(xml: Document, attributeName: string): number {
    const testResults: Node[] = this.collectAllElements(xml, "test-results");
    if (testResults.length === 0) {
      return 0;
    }

    const attr: Attr = testResults[0].attributes.getNamedItem(attributeName);
    if (attr.value) {
      return Number(attr.value);
    }
    return 0;
  }

  addTestResultsAttribute(xml: Document, attributeName: string, value: number) {
    const currentValue = this.getTestResultsAttribute(xml, attributeName);
    const testResults: Node[] = this.collectAllElements(xml, "test-results");
    const attr: Attr = testResults[0].attributes.getNamedItem(attributeName);
    if (attr) {
      attr.value = String(currentValue + value);
    }
  }
}
