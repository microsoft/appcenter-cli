import { ActivityWalker, ActivityBag } from './activity-walker';
import TextCutter from "../util/text-cuter";
import removeComments from "../util/remove-comments";

export function cleanSdkMainActivity(code: string, activityName: string): string {

  let info = analyzeCode(code, activityName);

  if (info.statements.some(x => !x.length))
    throw new Error('Something was wrong during cleaning main activity.');

  let textCutter = new TextCutter(code);
  info.statements.forEach(x =>
    textCutter
      .goto(x.startsAt)
      .cut(x.length)
      .cutEmptyLine());

  return textCutter.result;
}

function analyzeCode(code: string, activityName: string): CleanBag {

  let cleanBag = new CleanBag();
  let textWalker = new ActivityWalker<CleanBag>(code, cleanBag, activityName);

  //collecting import statements
  textWalker.addTrap(
    bag =>
      bag.blockLevel === 0 &&
      textWalker.currentChar === 'i',
    bag => {
      let regexp = /^import\s+com\s*.\s*microsoft\s*.\s*azure\s*.\s*mobile\s*.\s*(MobileCenter|analytics\s*.\s*Analytics|crashes\s*.\s*Crashes|distribute\s*.\s*Distribute)\s*;\s*?\n?/;
      let matches = textWalker.forepart.match(regexp);
      if (matches && matches[0]) {
        bag.statements.push({
          startsAt: textWalker.position,
          length: matches[0].length
        });
      }
    }
  );

  //start SDK statements
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      !bag.currentStatement &&
      textWalker.currentChar === 'M',
    bag => {
      let matches = removeComments(textWalker.forepart).match(/^MobileCenter\s*.\s*start\(/);
      if (matches && matches[0]) {
        bag.currentStatement = { startsAt: textWalker.position };
        bag.parenthesisLevel = 0;
      }
    }
  );

  //tracking parenthesis
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.currentStatement &&
      textWalker.currentChar === '(',
    bag =>
      bag.parenthesisLevel++
  );
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.currentStatement &&
      textWalker.currentChar === ')',
    bag =>
      bag.parenthesisLevel--
  );

  //catching ';'
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.currentStatement &&
      bag.parenthesisLevel === 0 &&
      textWalker.currentChar === ';',
    bag => {
      let matches = textWalker.forepart.match(/^\s*;\s*/);
      bag.currentStatement.length = textWalker.position - bag.currentStatement.startsAt + matches[0].length;
      bag.statements.push(bag.currentStatement);
      bag.currentStatement = null;
    }
  );

  //stop
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod === false,
    () =>
      textWalker.stop()
  );

  return textWalker.walk();
}

class CleanBag extends ActivityBag {
  parenthesisLevel: number;

  currentStatement: IStatement;
  statements: IStatement[] = [];
}

class IStatement {
  startsAt: number;
  length?: number;
}