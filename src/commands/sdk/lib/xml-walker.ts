import { IFragment } from "./ifragment";
import { TextWalker } from "./util/text-walker";

export class XmlWalker<TBag extends XmlBag> extends TextWalker<TBag> {

  constructor(text: string, bag: TBag) {
    super(text, bag);

    //comments
    this.addTrap(
      bag =>
        this.forepart.substr(0, 4) === '<!--',
      bag => {
        let matches = this.forepart.match(/^<!--[^]*?-->/);
        if (matches && matches[0])
          this.jump(matches[0].length);
      }
    );

    // start tag
    this.addTrap(
      bag =>
        this.currentChar === '<',
      bag => {
        let matches = this.forepart.match(/^<\s*(\w+)\s*([^>]*?)?\s*(\/?)\s*>/);
        if (matches && matches[0] && matches[1]) {
          bag.current = new XmlTag(matches[1], bag.current);
          bag.current.startsAt = this.position;
          bag.current.text = matches[0];
          bag.current.attributes = matches[2];

          if (!bag.root)
            bag.root = bag.current;

          if (matches[matches.length - 1] === '/') {
            bag.finishCurrent();
          }

          this.jump(matches[0].length);
        }
      }
    );

    // end tag
    this.addTrap(
      bag =>
        this.currentChar === '<',
      bag => {
        let matches = this.forepart.match(/^<\s*\/\s*([^>]*?)?\s*>/);
        if (matches && matches[0] && matches[1]) {
          if (matches[1] !== bag.current.name) {
            bag.error = new Error('finish tag ' + bag.current.name); //TODO: Normal error description
            return this.stop();
          }
          let startsAt = bag.current.startsAt + bag.current.text.length;
          bag.current.body = {
            startsAt,
            text: this.text.substring(startsAt, this.position)
          };
          bag.current.text += bag.current.body.text + matches[0];
          bag.finishCurrent();
        }
      }
    );

  }
}

export class XmlBag {
  root: XmlTag;
  current: XmlTag;
  error?: Error;
  onTagReaded: (tag: XmlTag) => void;

  finishCurrent() {
    if (this.current.parent)
      this.current.parent.children.push(this.current);
    if (this.onTagReaded)
      this.onTagReaded(this.current);
    this.current = this.current.parent;
  }
}

export class XmlTag implements IFragment {
  attributes: string;
  body: IFragment;
  children: XmlTag[];
  startsAt: number;
  text: string;

  constructor(
    public name: string,
    public parent?: XmlTag) {

    this.children = [];
  }

  get path(): string {
    return this.parent ? `${this.parent.path}/${this.name}` : this.name;
  }
}