import * as pfs from "../../../util/misc/promisfied-fs";
import { XmlUtil } from "./xml-util";
import * as fs from "fs";
import { DOMParser } from "xmldom";

export class JUnitXmlUtil extends XmlUtil {

  async mergeXmlResults(pathToArchive: string): Promise<Document> {
    const tempPath: string = await pfs.mkTempDir("appcenter-junittestreports");
    let mainXml: Document = this.getEmptyXmlDocument();

    const self: JUnitXmlUtil = this;

    return this.getMergeXmlResultsPromise(pathToArchive, tempPath,
      (fullPath: string, relativePath: string) => {
        const xml: Document = new DOMParser(XmlUtil.DOMParserConfig).parseFromString(fs.readFileSync(fullPath, "utf-8"), "text/xml");

        let name: string = "unknown";
        const matches: RegExpMatchArray = relativePath.match("^(.*)_TEST.*");
        if (matches && matches.length > 1) {
          name = matches[1].replace(/\./gi, "_");
        }

        self.appendToTestNameTransformation(xml, name);
        self.removeIgnoredTransformation(xml);

        mainXml = self.combine(mainXml, xml);
      },
      (resolve: Function) => {
        resolve(mainXml);
      }
    );
  }

  public getArchiveName(): string {
    return "junit_xml_zip.zip";
  }

  combine(xml1: Document, xml2: Document): Document {
    const testSuitesElement: Element = this.collectAllElements(xml1.documentElement, "testsuites")[0];
    const xml1testSuites: Element[] = this.collectChildren(xml1.documentElement, "testsuite");
    const xml2TestSuites: Element[] = this.collectChildren(xml2.documentElement, "testsuite");

    xml2TestSuites.forEach((xml2TestSuite: Element) => {
      let needToAddNewTestSuite: boolean = true;

      // Skip test suite without test cases
      if (this.collectAllElements(xml2TestSuite, "testcase").length === 0) {
        return;
      }

      // Combine all test cases in one test suite with the same class name
      const testSuiteName: string = xml2TestSuite.attributes.getNamedItem("name").value;

      xml1testSuites.every((xml1TestSuite: Element) => {
        const suiteNameAttr: Attr = xml1TestSuite.attributes.getNamedItem("name");
        if (!suiteNameAttr || suiteNameAttr.value !== testSuiteName) {

          // Take the next test suite
          return true;
        }

        // Combine test suite attributes
        this.combineAllAttributes(xml1TestSuite, xml2TestSuite);

        const testCases: Element[] = this.collectChildren(xml2TestSuite, "testcase");
        testCases.forEach((testCase: Element) => {
          xml1TestSuite.appendChild(testCase);
        });

        needToAddNewTestSuite = false;

        // Stop processing
        return false;
      });

      if (needToAddNewTestSuite) {
        testSuitesElement.appendChild(xml2TestSuite);
      }

      // Add test suite info to summary
      this.combineAllAttributes(testSuitesElement, xml2TestSuite);
    });

    return xml1;
  }

  getEmptyXmlDocument(): Document {
    return new DOMParser().parseFromString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\
<testsuites tests=\"0\" failures=\"0\" time=\"0\" errors=\"0\" skipped=\"0\"></testsuites>", "text/xml");
  }

  appendToTestNameTransformation(xml: Document, text: string): void {
    const testCases: Element[] = this.collectAllElements(xml.documentElement, "testcase");
    testCases.forEach((testCase: Element) => {
      const name: Attr = testCase.attributes.getNamedItem("name");
      if (name) {
        name.value = `${name.value}${text}`;
      }
    });
  }

  removeIgnoredTransformation(xml: Document): void {
    const testCases: Element[] = this.collectAllElements(xml.documentElement, "testcase");

    testCases.forEach((testCase: Element) => {
      if (this.collectAllElements(testCase, "skipped").length === 0) {
        return;
      }

      const parent: Element = testCase.parentNode as Element;
      parent.removeChild(testCase);

      const testCaseTime: number = Number(testCase.attributes.getNamedItem("time").value);
      const timeAttr: Attr = parent.attributes.getNamedItem("time");
      if (timeAttr && timeAttr.value) {
        const time: number = Number(timeAttr.value) - testCaseTime;
        timeAttr.value = String(Math.round(time * 1000) / 1000);
      }

      const skippedAttr: Attr = parent.attributes.getNamedItem("skipped");
      if (skippedAttr && skippedAttr.value) {
        skippedAttr.value = String(Number(skippedAttr.value) - 1);
      }

      const testsAttr: Attr = parent.attributes.getNamedItem("tests");
      if (testsAttr && testsAttr.value) {
        testsAttr.value = String(Number(testsAttr.value) - 1);
      }
    });
  }

  removeEmptySuitesTransformation(xml: Document): void {
    const testSuites: Element[] = this.collectAllElements(xml.documentElement, "testsuite");
    testSuites.forEach((testSuite: Element) => {
      if (this.collectAllElements(testSuite, "testcase").length === 0) {
        testSuite.parentElement.removeChild(testSuite);
        xml.removeChild(testSuite);
      }
    });
  }

  combineAllAttributes(element1: Element, element2: Element) {
    this.combineAttributes(element1, element2, "tests");
    this.combineAttributes(element1, element2, "failures");
    this.combineAttributes(element1, element2, "time");
    this.combineAttributes(element1, element2, "errors");
    this.combineAttributes(element1, element2, "skipped");
  }

  combineAttributes(element1: Element, element2: Element, attributeName: string) {
    const attr1: Attr = element1.attributes.getNamedItem(attributeName);
    const attr2: Attr = element2.attributes.getNamedItem(attributeName);

    if (!attr1 || !attr1.value) {
      return;
    }

    if (!attr2 || !attr2.value) {
      return;
    }

    const attr1Value: number = Number(attr1.value);
    const attr2Value: number = Number(attr2.value);

    attr1.value = String(Math.round((attr1Value + attr2Value) * 1000) / 1000);
  }
}
