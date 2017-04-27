import { ISnippet } from "./../models/isnippet";
import TextWalker from "./text-walker";

export class XmlWalker<TBag extends XmlBag> extends TextWalker<TBag> {

  constructor(text: string, bag: TBag) {
    super(text, bag);

    // Comments
    this.addTrap(
      bag =>
        this.forepart.startsWith("<!--"),
      bag => {
        let matches = this.forepart.match(/^<!--[^]*?-->/);
        if (matches && matches[0])
          this.jump(matches[0].length);
      }
    );

    // Start tag
    this.addTrap(
      bag =>
        this.currentChar === "<",
      bag => {
        let matches = this.forepart.match(/^<\s*([:-\w]+)\s*([^>]*?)?\s*(\/?)\s*>/);
        if (matches && matches[0] && matches[1]) {
          bag.current = new XmlTag(matches[1], bag.current);
          bag.current.position = this.position;
          bag.current.text = matches[0];
          bag.current.attributes = this.parseAttributes(matches[2]);

          if (!bag.root)
            bag.root = bag.current;

          if (matches[matches.length - 1] === "/") {
            bag.completeCurrent();
          }

          this.jump(matches[0].length);
        }
      }
    );

    // End tag
    this.addTrap(
      bag =>
        this.currentChar === "<",
      bag => {
        let matches = this.forepart.match(/^<\s*\/\s*([^>]*?)?\s*>/);
        if (matches && matches[0] && matches[1]) {
          if (matches[1] !== bag.current.name) {
            bag.error = new Error("Unexpected tag closing - " + bag.current.name);
            return this.stop();
          }
          let startsAt = bag.current.position + bag.current.text.length;
          bag.current.body = {
            position: startsAt,
            text: this.text.substring(startsAt, this.position)
          };
          bag.current.text += bag.current.body.text + matches[0];
          bag.completeCurrent();
        }
      }
    );
  }

  private parseAttributes(source: string): IXmlAttributes {
    let attributes: IXmlAttributes = {};
    let regexp: RegExp = /\S*?([:-\w]+)\s*=\s*(["'])(.+)\2/g;
    let matches: RegExpExecArray;
    
    while (matches = regexp.exec(source)) {
      attributes[matches[1]] = matches[3];
    }

    return attributes;
  }
}

export class XmlBag {
  root: XmlTag;
  current: XmlTag;
  error?: Error;
  onTagReaded: (tag: XmlTag) => void;

  completeCurrent() {
    if (this.current.parent)
      this.current.parent.children.push(this.current);
    if (this.onTagReaded)
      this.onTagReaded(this.current);
    this.current = this.current.parent;
  }
}

export class XmlTag implements ISnippet {
  attributes: IXmlAttributes = {};
  body: ISnippet;
  children: XmlTag[] = [];
  position: number;
  text: string;

  constructor(
    public name: string,
    public parent?: XmlTag) {
  }

  get path(): string {
    return this.parent ? `${this.parent.path}/${this.name}` : this.name;
  }
}

export interface IXmlAttributes { 
  [name: string]: string 
}