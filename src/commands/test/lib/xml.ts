import {  } from "xmldom";
import { child } from "event-stream";

export function appendToTestNameTransformation(xml: Document, text: string) {
  let testCases: Node[] = collectAllElements(xml, "test-case");
  testCases.forEach((testCase: Node) => {
    let name: Attr = testCase.attributes.getNamedItem("name");
    if(name) {
      name.value = `${name.value}${text}`; // TODO: value or nodeValue?
    }
  });
}

export function removeIgnoredTransformation(xml: Document) {
  var testResults: Node[] = collectAllElements(xml, "test-results");
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

  var nodes: Node[] = collectAllElements(xml, "test-case");
  nodes.forEach((node: Node) => {
    let resultAttr = node.attributes.getNamedItem("result");
    if(resultAttr && resultAttr.value === "Ignored") {
      node.parentNode.removeChild(node);
    }
  });
}

export function removeEmptySuitesTransformation(xml: Document) {
  var nodes: Node[] = collectAllElements(xml, "test-suite");
  nodes.forEach((node: Node) => {
    if (countChildren(node) <= 1) {
      node.parentNode.removeChild(node);
    }
  });
}

export function combine(xml1: Document, xml2: Document): Document {
  combineTestResultsAttribute(xml1, xml2, "total");
  combineTestResultsAttribute(xml1, xml2, "errors");
  combineTestResultsAttribute(xml1, xml2, "failures");
  combineTestResultsAttribute(xml1, xml2, "not-run");
  combineTestResultsAttribute(xml1, xml2, "inconclusive");
  combineTestResultsAttribute(xml1, xml2, "ignored");
  combineTestResultsAttribute(xml1, xml2, "skipped");
  combineTestResultsAttribute(xml1, xml2, "invalid");

  let testSuitesParent: Node = collectAllElements(xml1, "test-results")[0];
  let testSuites: Node[] = collectChildren(xml2, "test-suite");

  testSuites.forEach((child: Node) => {
    testSuitesParent.appendChild(child);
  });

  return xml1;
}

export function collectAllElements(node: Node, name: string): Node[] {
  let result: Node[] = [];
  if (!node || !name) {
    return result;
  }
  if(node.nodeName === name) {
    result.push(node);
  }
  for(let i: number = 0; node.childNodes && i < node.childNodes.length; ++i) {
    result = result.concat(collectAllElements(node.childNodes[i], name));
  }
  return result;
}

export function collectChildren(node: Node, name: string): Node[] {
  if (!node || !name) {
    return [];
  }
  if (node.nodeName === name) {
    return [node];
  }
  let result: Node[] = [];
  for(let i: number = 0; node.childNodes && i < node.childNodes.length; ++i) {
    result = result.concat(collectChildren(node.childNodes[i], name));
  }
  return result;
}

export function countChildren(node: Node): number {
  if (!node || !node.childNodes) {
    return 0;
  }
  let result = node.childNodes.length;;
  for(let i: number = 0; i < node.childNodes.length; ++i) {
    result += countChildren(node.childNodes[i]);
  }
  return result;
}

function combineTestResultsAttribute(xml1: Document, xml2: Document, attributeName: string) {
  addTestResultsAttribute(xml1, attributeName, getTestResultsAttribute(xml2, attributeName));
}

function getTestResultsAttribute(xml: Document, attributeName: string): number {
  let testResults: Node[] = collectAllElements(xml, "test-results");
  if (testResults.length === 0) {
    return 0;
  }

  let attr: Attr = testResults[0].attributes.getNamedItem(attributeName);
  if(attr.value) {
    return Number(attr.value);
  }
  return 0;
}

function addTestResultsAttribute(xml: Document, attributeName: string, value: number) {
  let currentValue = getTestResultsAttribute(xml, attributeName);
  let testResults: Node[] = collectAllElements(xml, "test-results");
  let attr: Attr = testResults[0].attributes.getNamedItem(attributeName);
  if (attr) {
    attr.value = String(currentValue + value);
  }
}