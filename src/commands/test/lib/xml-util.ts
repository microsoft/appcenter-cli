import { JUnitXmlUtil } from "./junit-xml-util";
import { NUnitXmlUtil } from "./nunit-xml-util";

export abstract class XmlUtil {
  public abstract mergeXmlResults(pathToArchive: string): Promise<Document>;
  public abstract getArchiveName(): string;

  public collectAllElements(node: Node, name: string): Node[] {
    let result: Node[] = [];
    if (!node || !name) {
      return result;
    }
    if (node.nodeName === name) {
      result.push(node);
    }
    for (let i: number = 0; node.childNodes && i < node.childNodes.length; ++i) {
      result = result.concat(this.collectAllElements(node.childNodes[i], name));
    }
    return result;
  }

  public collectChildren(node: Node, name: string): Node[] {
    if (!node || !name) {
      return [];
    }
    if (node.nodeName === name) {
      return [node];
    }
    let result: Node[] = [];
    for (let i: number = 0; node.childNodes && i < node.childNodes.length; ++i) {
      result = result.concat(this.collectChildren(node.childNodes[i], name));
    }
    return result;
  }

  public countChildren(node: Node): number {
    if (!node || !node.childNodes) {
      return 0;
    }
    let result = node.childNodes.length;
    for (let i: number = 0; i < node.childNodes.length; ++i) {
      result += this.countChildren(node.childNodes[i]);
    }
    return result;
  }
}
