import { XmlUtil } from "./xml-util";
import { DOMParser } from "xmldom";

export class JUnitXmlUtil extends XmlUtil {

  getEmptyXmlDocument(): Document {
    return new DOMParser().parseFromString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\
<testsuites tests=\"0\" failures=\"0\" time=\"0\" errors=\"0\" skipped=\"0\"></testsuites>");
  }

  appendToTestNameTransformation(xml: Document, text: string): void {
    let testCases: Node[] = this.collectAllElements(xml, "testcase");
    testCases.forEach((testCase: Node) => {
      let name: Attr = testCase.attributes.getNamedItem("name");
      if (name) {
        name.value = `${name.value}${text}`;
      }
    });
  }

  removeIgnoredTransformation(xml: Document): void {
    let testCases: Node[] = this.collectAllElements(xml, "testcase");

    testCases.forEach((testCase: Node) => {
      if (this.collectAllElements(testCase, "skipped").length == 0) {
        return;
      }

      let parent: Node = testCase.parentNode;
      parent.removeChild(testCase);

      let testCaseTime: number = Number(testCase.attributes.getNamedItem("time").value);
      let timeAttr: Attr = parent.attributes.getNamedItem("time");
      if (timeAttr && timeAttr.value) {
        let time: number = Number(timeAttr.value) - testCaseTime;
        timeAttr.value = String(Math.round(time * 1000) / 1000);
      }

      let skippedAttr: Attr = parent.attributes.getNamedItem("skipped");
      if (skippedAttr && skippedAttr.value) {
        skippedAttr.value = String(Number(skippedAttr.value) - 1);
      }

      let testsAttr: Attr = parent.attributes.getNamedItem("tests");
      if (testsAttr && testsAttr.value) {
        testsAttr.value = String(Number(testsAttr.value) - 1);
      }
    });
  }

  removeEmptySuitesTransformation(xml: Document): void {
    let testSuites: Node[] = this.collectAllElements(xml, "testsuite");
    testSuites.forEach((testSuite: Node) => {
      if (this.collectAllElements(testSuite, "testcase").length === 0) {
        testSuite.parentNode.removeChild(testSuite);
        xml.removeChild(testSuite);
      }
    });
  }

  combine(xml1: Document, xml2: Document): Document {
    let testSuitesNode: Node = this.collectAllElements(xml1, "testsuites")[0];
    var xml1testSuites: Node[] = this.collectChildren(xml1, "testsuite");
    var xml2TestSuites: Node[] = this.collectChildren(xml2, "testsuite");

    xml2TestSuites.forEach((xml2TestSuite: Node) => {
      let needToAddNewTestSuite: boolean = true;

      // Skip test suite without test cases
      if (this.collectAllElements(xml2TestSuite, "testcase").length === 0) {
        return;
      }

      // Combine all test cases in one test suite with the same class name
      let testSuiteName: string = xml2TestSuite.attributes.getNamedItem("name").value;

      xml1testSuites.every((xml1TestSuite: Node) => {
        let suiteNameAttr: Attr = xml1TestSuite.attributes.getNamedItem("name");
        if (!suiteNameAttr || suiteNameAttr.value !== testSuiteName) {

          // Take the next test suite
          return true;
        }

        // Combine test suite attributes
        this.combineAllAttributes(xml1TestSuite, xml2TestSuite);

        let testCases: Node[] = this.collectChildren(xml2TestSuite, "testcase");
        testCases.forEach((testCase: Node) => {
          xml1TestSuite.appendChild(testCase);
        });

        needToAddNewTestSuite = false;

        // Stop processing
        return false;
      });

      if (needToAddNewTestSuite) {
        testSuitesNode.appendChild(xml2TestSuite);
      }

      // Add test suite info to summary
      this.combineAllAttributes(testSuitesNode, xml2TestSuite);
    });

    return xml1;
  }

  combineAllAttributes(node1: Node, node2: Node) {
    this.combineAttributes(node1, node2, "tests");
    this.combineAttributes(node1, node2, "failures");
    this.combineAttributes(node1, node2, "time");
    this.combineAttributes(node1, node2, "errors");
    this.combineAttributes(node1, node2, "skipped");
  }

  combineAttributes(node1: Node, node2: Node, attributeName: string) {
    let attr1: Attr = node1.attributes.getNamedItem(attributeName);
    let attr2: Attr = node2.attributes.getNamedItem(attributeName);

    if (!attr1 || !attr1.value) {
      return;
    }

    if (!attr2 || !attr2.value) {
      return;
    }

    let attr1Value: number = Number(attr1.value);
    let attr2Value: number = Number(attr2.value);

    attr1.value = String(Math.round((attr1Value + attr2Value) * 1000) / 1000);
  }
}