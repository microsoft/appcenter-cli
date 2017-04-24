import { StandardCodeWalker, StandardBag } from './../standard-code-walker';
import TextCutter from "../util/text-cuter";
import removeComments from "../util/remove-comments";

export function cleanSdkBuildGradle(code: string): string {
  let result: string;
  let info = analyzeCode(code);

  info.dependenciesBlocks
    .forEach(block => {
      let textCutter = new TextCutter(block.originalText);
      block.compiles.forEach(compile =>
        textCutter
          .goto(compile.position)
          .cut(compile.text.length)
          .cutEmptyLine()
      );
      block.modifiedText = textCutter.result;

      block.defs.forEach(def => {
        let regexp = new RegExp('\\W' + def.name + '\\W', 'g');
        if (regexp.exec(block.modifiedText) && !regexp.exec(block.modifiedText)) {
          textCutter
            .goto(def.position)
            .cut(def.text.length)
            .cutEmptyLine();
        }
      });

      block.modifiedText = textCutter.result;
    });

  result = code;
  let shift = 0;
  info.dependenciesBlocks.forEach(block => {
    result =
      result.substr(0, block.startsAt + shift) +
      block.modifiedText +
      result.substr(block.startsAt + block.originalText.length + shift);
    shift += block.modifiedText.length - block.originalText.length;
  });

  // //remove empty blocks
  result = result.replace(/dependencies\s*{\s*}/g, '');

  return result;
}

function analyzeCode(code: string): CleanBag {

  let cleanBag = new CleanBag();
  let textWalker = new StandardCodeWalker<CleanBag>(code, cleanBag);

  //collecting dependencies blocks
  textWalker.addTrap(
    bag =>
      bag.blockLevel === 1 &&
      !bag.currentBlock &&
      textWalker.prevChar === '{',
    bag => {
      let matches = removeComments(textWalker.backpart).match(/dependencies\s*{$/);
      if (matches && matches[0]) {
        bag.currentBlock = {
          startsAt: textWalker.position,
          defs: [],
          compiles: []
        };
      }
    }
  );
  textWalker.addTrap(
    bag =>
      bag.blockLevel === 1 &&
      bag.currentBlock &&
      textWalker.nextChar === '}',
    bag => {
      if (bag.currentBlock.compiles.length) {
        bag.currentBlock.originalText = code.substring(bag.currentBlock.startsAt, textWalker.position + 1);
        bag.dependenciesBlocks.push(bag.currentBlock);
      }
      bag.currentBlock = null;
    }
  );

  //catching defs
  textWalker.addTrap(
    bag =>
      bag.currentBlock &&
      textWalker.currentChar === 'd',
    bag => {
      let matches = removeComments(textWalker.forepart).match(/^def\s+(\w+)\s*=\s*["'](.+?)["']/);
      if (matches && matches[1] && matches[2])
        bag.currentBlock.defs.push({
          text: matches[0],
          name: matches[1],
          value: matches[2],
          position: textWalker.position - bag.currentBlock.startsAt
        });
    }
  );

  //catching compiles
  textWalker.addTrap(
    bag =>
      bag.currentBlock &&
      textWalker.currentChar === 'c',
    bag => {
      let matches = removeComments(textWalker.forepart).match(/^compile\s*["']com.microsoft.azure.mobile:mobile-center-(analytics|crashes|distribute):[^]+?["']/);
      if (matches && matches[1])
        bag.currentBlock.compiles.push({
          text: matches[0],
          module: matches[1],
          position: textWalker.position - bag.currentBlock.startsAt
        });
    }
  );

  return textWalker.walk();
}

class CleanBag extends StandardBag {
  currentBlock: IDependenciesBlock;
  dependenciesBlocks: IDependenciesBlock[] = [];
}

class IDependenciesBlock {
  startsAt: number;
  originalText?: string;
  modifiedText?: string;

  defs: {
    text: string;
    name: string;
    value: string;
    position: number
  }[];
  compiles: {
    text: string;
    module: string;
    position: number
  }[];
}