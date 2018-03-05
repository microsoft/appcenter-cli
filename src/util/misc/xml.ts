import * as xmlParser from "xml-parser";

interface Node {
  child: xmlParser.Node;
  parent: xmlParser.Node;
}

export function appendToTestNameTransformation(xml: xmlParser.Document, text: string) {
  let testCases: xmlParser.Node[] = [];
  collectAllElements(xml.root, "test-case", testCases);
  testCases.forEach((testCase: xmlParser.Node) => {
    if(testCase.attributes["name"]) {
      testCase.attributes["name"] = `${testCase.attributes["name"]}${text}`;
    }
  });
}

export function removeIgnoredTransformation(xml: xmlParser.Document) {
  var testResults: xmlParser.Node[] = [];
  collectAllElements(xml.root, "test-results", testResults);
  testResults.forEach((testResult: xmlParser.Node) => {
    let ignored: number = Number(testResult.attributes["ignored"]);
    if(ignored) {
      testResult.attributes["ignored"] = "0";

      let notRun: number = Number(testResult.attributes["not-run"]);
      if(notRun) {
        testResult.attributes["not-run"] = String(notRun - ignored);
      }
    }
  });

  var nodes: Node[] = [];
  collectAllElementsWithParent(xml.root, "test-case", nodes);
  nodes.forEach((node: Node) => {
    if(node.child.attributes["result"] === "Ignored") {
      let index = node.parent.children.indexOf(node.child);
      node.parent.children.slice(index,1);
    }
  });
}

export function removeEmptySuitesTransformation(xml: xmlParser.Document) {
  var nodes: Node[] = [];
  collectAllElementsWithParent(xml.root, "test-suite", nodes);
  nodes.forEach((node: Node) => {
    if (countChildren(node.child) <= 1) {
      let index = node.parent.children.indexOf(node.child);
      node.parent.children.slice(index,1);
    }
  });
}

export function combine(xml1: xmlParser.Document, xml2: xmlParser.Document): xmlParser.Document {
  combineTestResultsAttribute(xml1, xml2, "total");
  combineTestResultsAttribute(xml1, xml2, "errors");
  combineTestResultsAttribute(xml1, xml2, "failures");
  combineTestResultsAttribute(xml1, xml2, "not-run");
  combineTestResultsAttribute(xml1, xml2, "inconclusive");
  combineTestResultsAttribute(xml1, xml2, "ignored");
  combineTestResultsAttribute(xml1, xml2, "skipped");
  combineTestResultsAttribute(xml1, xml2, "invalid");

  xml2.root.children.forEach((child: xmlParser.Node) => {
    if(child.name === "test-suite") {
      xml1.root.children.push(child);
    }
  });

  return xml1;
}

function collectAllElements(node: xmlParser.Node, name: string, result: xmlParser.Node[]) {
  if(node.name === name) {
    result.push(node);
  }
  node.children.forEach((element: xmlParser.Node) => {
    collectAllElements(element, name, result);
  });
}

function collectAllElementsWithParent(node: xmlParser.Node, name: string, result: Node[]) {
  node.children.forEach((element: xmlParser.Node) => {
    if(element.name === name) {
      result.push({ child: element, parent: node });
    }
    collectAllElementsWithParent(element, name, result);
  })
}

function countChildren(node: xmlParser.Node): number {
  let result = node.children.length;
  node.children.forEach((child: xmlParser.Node) => {
    result += countChildren(child);
  })
  return result;
}

function combineTestResultsAttribute(xml1: xmlParser.Document, xml2: xmlParser.Document, attributeName: string) {
  addTestResultsAttribute(xml1, attributeName, getTestResultsAttribute(xml2, attributeName));
}

function getTestResultsAttribute(xml: xmlParser.Document, attributeName: string): number {
  let testResults: xmlParser.Node[] = [];
  collectAllElements(xml.root, "test-results", testResults);

  let value: number = Number(testResults[0].attributes[attributeName]);
  if(value) {
    return value;
  }
  return 0;
}

function addTestResultsAttribute(xml: xmlParser.Document, attributeName: string, value: number) {
  let currentValue = getTestResultsAttribute(xml, attributeName);
  let testResults: xmlParser.Node[] = [];
  collectAllElements(xml.root, "test-results", testResults);
  testResults[0].attributes[attributeName] = String(currentValue + value);
}