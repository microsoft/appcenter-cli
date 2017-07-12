import { ISnippet } from './../models/i-snippet';
import TextWalker from "./text-walker";

export class CodeWalker<TBag extends CodeBag> extends TextWalker<TBag> {

  constructor(text: string, bag: TBag) {
    super(replaceComments(text), bag);

    addTraps(this);
  }
}

export class CodeBag {
  blockLevel: number = 0;
}

function addTraps(walker: TextWalker<CodeBag>) {
  // Block levels
  walker.addTrap(
    bag =>
      walker.currentChar === "{",
    bag =>
      bag.blockLevel++
  );
  walker.addTrap(
    bag =>
      walker.currentChar === "}",
    bag =>
      bag.blockLevel--
  );

  // Quotes
  walker.addTrap(
    bag =>
      walker.currentChar === "'" ||
      walker.currentChar === "\"",
    bag => {
      let matches = walker.forepart.match(`^${walker.currentChar}([^${walker.currentChar}\\\\]|\\\\.)*${walker.currentChar}`);
      if (matches && matches[0])
        walker.jump(matches[0].length);
    }
  );
}

function replaceComments(code: string): string {
  const walker = new TextWalker(code, new CodeBag())
  addTraps(walker);

  let comments: ISnippet[] = [];

  // Single-line comments
  walker.addTrap(
    bag =>
      walker.forepart.substr(0, 2) === "//",
    bag => {
      let matches = walker.forepart.match(/^\/\/[^]*?\n/);
      if (matches && matches[0])
        comments.push({
          position: walker.position,
          text: matches[0]
        });
      walker.jump(matches[0].length);
    }
  );

  // Multi-line comments
  walker.addTrap(
    bag =>
      walker.forepart.substr(0, 2) === "/*",
    bag => {
      let matches = walker.forepart.match(/^\/\*[^]*?\*\//);
      if (matches && matches[0])
        comments.push({
          position: walker.position,
          text: matches[0]
        });
      walker.jump(matches[0].length);
    });

  walker.walk();

  let result = code;
  for (let comment of comments) {
    result = result.substr(0, comment.position) + ' '.repeat(comment.text.length) + result.substr(comment.position + comment.text.length);
  }

  return result;
}