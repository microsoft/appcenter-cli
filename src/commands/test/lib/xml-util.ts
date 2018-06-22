import * as fs from "fs";
import { DOMParser } from "xmldom";

export abstract class XmlUtil {
  public abstract mergeXmlResults(pathToArchive: string): Promise<Document>;
  public abstract getArchiveName(): string;

  public collectAllElements(element: Element, name: string): Element[] {
    let result: Element[] = [];
    if (!element || !name) {
      return result;
    }
    if (element.nodeName === name) {
      result.push(element);
    }
    for (let i: number = 0; element.childNodes && i < element.childNodes.length; ++i) {
      result = result.concat(this.collectAllElements(element.childNodes[i] as Element, name));
    }
    return result;
  }

  public collectChildren(element: Element, name: string): Element[] {
    if (!element || !name) {
      return [];
    }
    if (element.nodeName === name) {
      return [element];
    }
    let result: Element[] = [];
    for (let i: number = 0; element.childNodes && i < element.childNodes.length; ++i) {
      result = result.concat(this.collectChildren(element.childNodes[i] as Element, name));
    }
    return result;
  }

  public countChildren(element: Element): number {
    if (!element || !element.childNodes) {
      return 0;
    }
    let result = element.childNodes.length;
    for (let i: number = 0; i < element.childNodes.length; ++i) {
      result += this.countChildren(element.childNodes[i] as Element);
    }
    return result;
  }
}

export function validXmlFile(file: string): boolean {
  try {
    const xml = new DOMParser().parseFromString(fs.readFileSync(file, "utf-8"));

    return xml != null;
  } catch {
    return false;
  }
}
