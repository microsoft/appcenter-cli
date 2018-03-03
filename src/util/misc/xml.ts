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