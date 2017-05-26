import { CodeWalker, CodeBag } from "../util/code-walker";
import removeComments from "../util/remove-comments";

export class ActivityWalker<TBag extends ActivityBag> extends CodeWalker<TBag> {

  constructor(text: string, bag: TBag, activityName: string) {
    super(text, bag);

    // Class definition
    this.addTrap(
      bag =>
        bag.blockLevel === 1 &&
        this.currentChar === "{",
      bag => {
        let matches = removeComments(this.backpart).match(`\\s*public\\s+class\\s+${activityName}\\s+extends[^{]+$`);
        if (matches && matches[0])
          bag.isWithinClass = true;
      }
    );
    this.addTrap(
      bag =>
        bag.blockLevel === 0 &&
        bag.isWithinClass &&
        this.currentChar === "}",
      bag => bag.isWithinClass = false
    );

    // onCreate method definition
    this.addTrap(
      bag =>
        bag.isWithinClass &&
        bag.blockLevel === 2 &&
        this.currentChar === "{",
      bag => {
        let matches = removeComments(this.backpart).match(/^([ \t]+)@Override\s+(public|protected)\s+void\s+onCreate\s*\(\s*Bundle\s+\w+\s*\)\s*$/m);
        if (matches) {
          bag.isWithinMethod = true;
          bag.indent = matches[1];
        }
      }
    );
    this.addTrap(
      bag =>
        bag.isWithinMethod &&
        bag.blockLevel === 1,
      bag =>
        bag.isWithinMethod = false
    );
  }
}

export class ActivityBag extends CodeBag {
  isWithinClass: boolean;
  isWithinMethod: boolean;
  indent: string;
}