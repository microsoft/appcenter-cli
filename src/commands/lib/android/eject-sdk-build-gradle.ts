import { IBuildGradle } from './models/build-gradle';
import TextCutter from "../util/text-cuter";

export default function ejectSdkBuildGradle(buildGradle: IBuildGradle): string {
  let result: string;
  
  buildGradle.dependenciesBlocks
    .forEach(block => {
      let textCutter = new TextCutter(block.text);
      block.compiles.forEach(compile =>
        textCutter
          .goto(compile.position)
          .cut(compile.text.length)
          .cutEmptyLine()
      );
      block.modifiedText = textCutter.result;

      block.defs.forEach(def => {
        let regexp = new RegExp("\\W" + def.name + "\\W", "g");
        if (regexp.exec(block.modifiedText) && !regexp.exec(block.modifiedText)) {
          textCutter
            .goto(def.position)
            .cut(def.text.length)
            .cutEmptyLine();
        }
      });

      block.modifiedText = textCutter.result;
    });

  result = buildGradle.contents;
  let shift = 0;
  buildGradle.dependenciesBlocks.forEach(block => {
    result =
      result.substr(0, block.position + shift) +
      block.modifiedText +
      result.substr(block.position + block.text.length + shift);
    shift += block.modifiedText.length - block.text.length;
  });

  // Remove empty blocks
  result = result.replace(/dependencies\s*{\s*}/g, "");

  return result;
}