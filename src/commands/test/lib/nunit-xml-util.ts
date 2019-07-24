import * as pfs from "../../../util/misc/promisfied-fs";
import { XmlUtil } from "./xml-util";
import * as fs from "fs";
import { DOMParser } from "xmldom";

export class NUnitXmlUtil extends XmlUtil {

  async mergeXmlResults(pathToArchive: string): Promise<Document> {
    const tempPath: string = await pfs.mkTempDir("appcenter-uitestreports");
    let mainXml: Document = null;

    const self: NUnitXmlUtil = this;

    const outputXml: Promise<Document> = this.getMergeXmlResultsPromise(pathToArchive, tempPath,
      (fullPath: string, relativePath: string) => {
        const xml: Document = new DOMParser(XmlUtil.DOMParserConfig).parseFromString(fs.readFileSync(fullPath, "utf-8"), "text/xml");

        let name: string = "unknown";
        const matches: RegExpMatchArray = relativePath.match("^(.*)[_-]nunit[_-]report");
        if (matches && matches.length > 1) {
          name = matches[1].replace(/\./gi, "_");
        }

        self.appendToTestNameTransformation(xml, `_${name}`);
        self.removeIgnoredTransformation(xml);
        self.removeEmptySuitesTransformation(xml);
        if (mainXml) {
          if (this.isNUnit3(xml)) {
            mainXml = self.combineNUnit3(mainXml, xml);
          } else {
            mainXml = self.combineNUnit2(mainXml, xml);
          }
        } else {
          mainXml = xml;
        }
      },
      (resolve: Function) => {
        resolve(mainXml);
      }
    );

    return outputXml;
  }

  public getArchiveName(): string {
    return "nunit_xml_zip.zip";
  }

  combineNUnit2(xml1: Document, xml2: Document): Document {
    this.combineResultsAttribute(xml1, xml2, "total");
    this.combineResultsAttribute(xml1, xml2, "errors");
    this.combineResultsAttribute(xml1, xml2, "failures");
    this.combineResultsAttribute(xml1, xml2, "not-run");
    this.combineResultsAttribute(xml1, xml2, "inconclusive");
    this.combineResultsAttribute(xml1, xml2, "ignored");
    this.combineResultsAttribute(xml1, xml2, "skipped");
    this.combineResultsAttribute(xml1, xml2, "invalid");

    const testSuitesParent: Element = this.collectAllElements(xml1.documentElement, "test-results")[0];
    const testSuites: Element[] = this.collectChildren(xml2.documentElement, "test-suite");

    testSuites.forEach((child: Element) => {
      testSuitesParent.appendChild(child);
    });

    return xml1;
  }

  combineNUnit3(xml1: Document, xml2: Document): Document {
    this.combineResultsAttribute(xml1, xml2, "testcasecount");
    this.combineResultsAttribute(xml1, xml2, "total");
    this.combineResultsAttribute(xml1, xml2, "passed");
    this.combineResultsAttribute(xml1, xml2, "failed");
    this.combineResultsAttribute(xml1, xml2, "inconclusive");
    this.combineResultsAttribute(xml1, xml2, "skipped");
    this.combineResultsAttribute(xml1, xml2, "asserts");

    const testSuitesParent: Element = this.collectAllElements(xml1.documentElement, "test-run")[0];
    const testSuites: Element[] = this.collectChildren(xml2.documentElement, "test-suite");

    testSuites.forEach((child: Element) => {
      testSuitesParent.appendChild(child);
    });

    return xml1;
  }

  appendToTestNameTransformation(xml: Document, text: string): void {
    const testCases: Element[] = this.collectAllElements(xml.documentElement, "test-case");
    testCases.forEach((testCase: Element) => {
      const name: Attr = testCase.attributes.getNamedItem("name");
      if (name) {
        name.value = `${name.value}${text}`;
      }
    });
  }

  removeIgnoredTransformation(xml: Document): void {
    const testResults: Element[] = this.collectAllElements(xml.documentElement, "test-results");
    testResults.forEach((testResult: Element) => {
      const ignoredAttr: Attr = testResult.attributes.getNamedItem("ignored");
      if (ignoredAttr) {
        const notRunAttr: Attr = testResult.attributes.getNamedItem("not-run");
        if (notRunAttr) {
          const notRun: number = Number(notRunAttr.value);
          const ignored: number = Number(ignoredAttr.value);
          notRunAttr.value = String(notRun - ignored);
        }
        ignoredAttr.value = "0";
      }
    });

    const elements: Element[] = this.collectAllElements(xml.documentElement, "test-case");
    elements.forEach((element: Element) => {
      const resultAttr: Attr = element.attributes.getNamedItem("result");
      if (resultAttr && resultAttr.value === "Ignored" ||  resultAttr.value === "Skipped") {
        element.parentNode.removeChild(element);
      }
    });
  }

  removeEmptySuitesTransformation(xml: Document): void {
    const elements: Element[] = this.collectAllElements(xml.documentElement, "test-suite");
    elements.forEach((element: Element) => {
      if (this.countChildren(element) <= 1) {
        element.parentNode.removeChild(element);
      }
    });
  }

  combineResultsAttribute(xml1: Document, xml2: Document, attributeName: string) {
    this.addResultsAttribute(xml1, attributeName, this.getResultsAttribute(xml2, attributeName));
  }

  getResultsAttribute(xml: Document, attributeName: string): number {
    const testResults: Element = this.getResultsNode(xml);
    if (!testResults) {
      return 0;
    }

    const attr: Attr = testResults.attributes.getNamedItem(attributeName);
    if (attr.value) {
      return Number(attr.value);
    }
    return 0;
  }

  addResultsAttribute(xml: Document, attributeName: string, value: number) {
    const currentValue: number = this.getResultsAttribute(xml, attributeName);
    const testResults: Element = this.getResultsNode(xml);

    if (!testResults) {
      return;
    }

    const attr: Attr = testResults.attributes.getNamedItem(attributeName);
    if (attr) {
      attr.value = String(currentValue + value);
    }
  }

  getResultsNode(xml: Document): Element {
    let testResults: Element[] = this.collectAllElements(xml.documentElement, "test-results");
    if (testResults.length === 0) {
      testResults = this.collectAllElements(xml.documentElement, "test-run");
    }

    return testResults[0];
  }

  isNUnit3(xml: Document): boolean {
    const testResults: Element[] = this.collectAllElements(xml.documentElement, "test-results");
    return testResults.length === 0;
  }
}
