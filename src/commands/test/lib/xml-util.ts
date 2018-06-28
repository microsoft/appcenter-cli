import * as fs from "fs";
import * as path from "path";
import * as unzip from "unzip";
import { DOMParser } from "xmldom";

export abstract class XmlUtil {
  public abstract mergeXmlResults(pathToArchive: string): Promise<Document>;
  public abstract getArchiveName(): string;

  // Handle DOMParser warnings, errors and fatalErrors like JS exceptions
  public static DOMParserConfig: object = {
    locator: {},
    errorHandler: function (level: string, msg: string) {
      throw `DOMParser${level}: ${msg}`;
    }
  };

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

  public getMergeXmlResultsPromise(pathToArchive: string, tempPath: string, processXml: Function, resolvePromise: Function): Promise<Document> {
    return new Promise<Document>((resolve, reject) => {
      fs.createReadStream(pathToArchive)
        .pipe(unzip.Parse())
        .on("entry", function (entry: unzip.Entry) {
          // Skip directories and hidden system files
          if (entry.type === "Directory" || path.basename(entry.path).substring(0, 1) === ".") {
            return;
          }
          const fullPath: string = path.join(tempPath, entry.path);
          entry.pipe(fs.createWriteStream(fullPath).on("close", () => {
            try {
              processXml(fullPath, entry);
            } catch (e) {
              reject(e);
            }
          }));
        })
        .on("close", () => {
          resolvePromise(resolve);
        });
    });
  }
}

export function validXmlFile(file: string): boolean {
  try {
    const xml = new DOMParser(XmlUtil.DOMParserConfig).parseFromString(fs.readFileSync(file, "utf-8"), "text/xml");

    return xml != null;
  } catch {
    return false;
  }
}
