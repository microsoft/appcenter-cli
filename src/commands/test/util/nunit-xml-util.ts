import { XmlUtil } from "./xml-util";

export class NUnitXmlUtil extends XmlUtil {

  appendToTestNameTransformation(xml: Document, text: string): void {
    let testCases: Node[] = this.collectAllElements(xml, "test-case");
    testCases.forEach((testCase: Node) => {
      let name: Attr = testCase.attributes.getNamedItem("name");
      if (name) {
        name.value = `${name.value}${text}`;
      }
    });
  }

  removeIgnoredTransformation(xml: Document): void {
    var testResults: Node[] = this.collectAllElements(xml, "test-results");
    testResults.forEach((testResult: Node) => {
      let ignoredAttr: Attr = testResult.attributes.getNamedItem("ignored");
      if (ignoredAttr) {
        let notRunAttr: Attr = testResult.attributes.getNamedItem("not-run");
        if (notRunAttr) {
          let notRun = Number(notRunAttr.value);
          let ignored = Number(ignoredAttr.value);
          notRunAttr.value = String(notRun - ignored);
        }
        ignoredAttr.value = "0";
      }
    });

    var nodes: Node[] = this.collectAllElements(xml, "test-case");
    nodes.forEach((node: Node) => {
      let resultAttr = node.attributes.getNamedItem("result");
      if(resultAttr && resultAttr.value === "Ignored") {
        node.parentNode.removeChild(node);
      }
    });
  }

  removeEmptySuitesTransformation(xml: Document): void {
    var nodes: Node[] = this.collectAllElements(xml, "test-suite");
    nodes.forEach((node: Node) => {
      if (this.countChildren(node) <= 1) {
        node.parentNode.removeChild(node);
      }
    });
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
  
    let testSuitesParent: Node = this.collectAllElements(xml1, "test-results")[0];
    let testSuites: Node[] = this.collectChildren(xml2, "test-suite");
  
    testSuites.forEach((child: Node) => {
      testSuitesParent.appendChild(child);
    });
  
    return xml1;
  }

  combineTestResultsAttribute(xml1: Document, xml2: Document, attributeName: string) {
    this.addTestResultsAttribute(xml1, attributeName, this.getTestResultsAttribute(xml2, attributeName));
  }

  getTestResultsAttribute(xml: Document, attributeName: string): number {
    let testResults: Node[] = this.collectAllElements(xml, "test-results");
    if (testResults.length === 0) {
      return 0;
    }

    let attr: Attr = testResults[0].attributes.getNamedItem(attributeName);
    if(attr.value) {
      return Number(attr.value);
    }
    return 0;
  }

  addTestResultsAttribute(xml: Document, attributeName: string, value: number) {
    let currentValue = this.getTestResultsAttribute(xml, attributeName);
    let testResults: Node[] = this.collectAllElements(xml, "test-results");
    let attr: Attr = testResults[0].attributes.getNamedItem(attributeName);
    if (attr) {
      attr.value = String(currentValue + value);
    }
  }
}