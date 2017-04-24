import { ActivityBag, ActivityWalker } from './activity-walker';

export function injectSdkMainActivity(code: string, activityName: string, importStatements: string[], startSdkStatements: string[]): string {
  let result: string;
  let info = analyzeCode(code, activityName);

  if (info.injectStartSdkAt == undefined)
    throw new Error("Cannot integrate the MobileCenter SDK into the main activity file.");
  info.indent = info.indent || '    ';
  info.injectImportsAt = info.injectImportsAt || 0;

  result = code.substr(0, info.injectImportsAt);
  importStatements.forEach(x => result += '\r\n' + x);
  result += code.substr(info.injectImportsAt, info.injectStartSdkAt - info.injectImportsAt).replace(/^\s*/, '\r\n\r\n');
  startSdkStatements.forEach(x => result += '\r\n' + info.indent + info.indent + x);
  result += code.substr(info.injectStartSdkAt).replace(/^[ \t]*}/, '\r\n' + info.indent + '}');

  return result;
}

function analyzeCode(code: string, activityName: string): InjectBag {

  let injectBag = new InjectBag();
  let textWalker = new ActivityWalker<InjectBag>(code, injectBag, activityName);

  //import statements
  textWalker.addTrap(
    bag =>
      !bag.blockLevel &&
      textWalker.currentChar === 'i',
    bag => {
      let matches = textWalker.forepart.match(/^import\s+[^]+?;/);
      if (matches && matches[0]) {
        bag.injectImportsAt = textWalker.position + matches[0].length;
      }
    }
  );

  //start SDK position
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod,
    bag => {
      bag.injectStartSdkAt = textWalker.position + 1;
      textWalker.stop();
    }
  );

  return textWalker.walk();
}

class InjectBag extends ActivityBag {
  indent: string;
  injectImportsAt: number;
  injectStartSdkAt: number;
}