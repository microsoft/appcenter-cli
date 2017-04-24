import { TextWalker } from "./util/text-walker";

export class StandardCodeWalker<TBag extends StandardBag> extends TextWalker<TBag> {

  constructor(text: string, bag: TBag) {
    super(text, bag);

    //block levels
    this.addTrap(
      bag =>
        this.currentChar === '{',
      bag =>
        bag.blockLevel++
    );
    this.addTrap(
      bag =>
        this.currentChar === '}',
      bag =>
        bag.blockLevel--
    );

    //single-line comments
    this.addTrap(
      bag =>
        this.forepart.substr(0, 2) === '//',
      bag => {
        let matches = this.forepart.match(/^\/\/[^]*?\n/);
        if (matches && matches[0])
          this.jump(matches[0].length);
      }

    );

    //multi-line comments
    this.addTrap(
      bag =>
        this.forepart.substr(0, 2) === '/*',
      bag => {
        let matches = this.forepart.match(/^\/\*[^]*?\*\//);
        if (matches && matches[0])
          this.jump(matches[0].length);
      }

    );

    //quotes
    this.addTrap(
      bag =>
        this.currentChar === '\'' ||
        this.currentChar === '"',
      bag => {
        let matches = this.forepart.match(`^${this.currentChar}([^${this.currentChar}\\\\]|\\\\.)*${this.currentChar}`);
        if (matches && matches[0])
          this.jump(matches[0].length);
      }
    );
  }
}

export class StandardBag {
  blockLevel: number = 0;
}