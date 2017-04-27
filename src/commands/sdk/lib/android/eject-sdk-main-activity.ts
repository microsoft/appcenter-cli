import { IMainActivity } from './models/main-activity';
import TextCutter from "../util/text-cuter";

export default function ejectSdkMainActivity(mainActivity: IMainActivity): string {
  let textCutter = new TextCutter(mainActivity.contents);
  mainActivity.importStatements.forEach(x =>
    textCutter
      .goto(x.position)
      .cut(x.text.length)
      .cutEmptyLine());
  
  textCutter
    .goto(mainActivity.startSdkStatement.position)
    .cut(mainActivity.startSdkStatement.text.length)
    .cutEmptyLine();

  return textCutter.result;
}