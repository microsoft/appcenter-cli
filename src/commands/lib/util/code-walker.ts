import TextWalker from "./text-walker";

export class CodeWalker<TBag extends CodeBag> extends TextWalker<TBag> {

  constructor(text: string, bag: TBag) {
    super(text, bag);

    // Block levels
    this.addTrap(
      bag =>
        this.currentChar === "{",
      bag =>
        bag.blockLevel++
    );
    this.addTrap(
      bag =>
        this.currentChar === "}",
      bag =>
        bag.blockLevel--
    );

    // Single-line comments
    this.addTrap(
      bag =>
        this.forepart.substr(0, 2) === "//",
      bag => {
        let matches = this.forepart.match(/^\/\/[^]*?\n/);
        if (matches && matches[0])
          this.jump(matches[0].length);
      }

    );

    // Multi-line comments
    this.addTrap(
      bag =>
        this.forepart.substr(0, 2) === "/*",
      bag => {
        let matches = this.forepart.match(/^\/\*[^]*?\*\//);
        if (matches && matches[0])
          this.jump(matches[0].length);
      }

    );

    // Quotes
    this.addTrap(
      bag =>
        this.currentChar === "'" ||
        this.currentChar === "\"",
      bag => {
        let matches = this.forepart.match(`^${this.currentChar}([^${this.currentChar}\\\\]|\\\\.)*${this.currentChar}`);
        if (matches && matches[0])
          this.jump(matches[0].length);
      }
    );
  }
}

export class CodeBag {
  blockLevel: number = 0;
}