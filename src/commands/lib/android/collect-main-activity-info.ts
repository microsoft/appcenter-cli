import { IBuildGradle, ISourceSet } from './models/build-gradle';
import { IMainActivity, IImportStatement, IStartSdkStatement } from "./models/main-activity";
import * as fs from "async-file";
import * as path from "path";
import { XmlWalker, XmlBag } from "../util/xml-walker";
import * as _ from "lodash"
import { ActivityWalker, ActivityBag } from "./activity-walker";
import removeComments from "../util/remove-comments";
import { MobileCenterSdkModule } from "../models/mobilecenter-sdk-module";

export default async function collectMainActivityInfo(buildGradle: IBuildGradle): Promise<IMainActivity> {
  const fullName = await getMainActivityName(buildGradle.path, buildGradle.sourceSets);
  const name = fullName.match(/\w+$/)[0];
  const { mainActivityPath, mainActivityContents} = 
    await readMainActivity(buildGradle.path, buildGradle.sourceSets, fullName);
  
  const info = analyze(mainActivityContents, name);

  return {
    path: mainActivityPath,
    contents: mainActivityContents,
    name,
    fullName,
    importStatements: info.importStatements,
    startSdkStatement: info.startSdkStatement
  };
}

async function getMainActivityName(projectPath: string, sourceSets: ISourceSet[]): Promise<string> {
  for (let sourceSet of sourceSets.filter(x => x.manifestSrcFile)) {
    const manifestPath = path.join(path.dirname(projectPath), sourceSet.manifestSrcFile);
    try {
      await fs.access(manifestPath, fs.constants.R_OK)
    } catch (err) {
      continue;
    }
    const manifestContents = await fs.readTextFile(manifestPath, "utf8");
    
    const manifestTag = new XmlWalker(manifestContents, new XmlBag()).walk().root;
    if (!manifestTag || manifestTag.name !== "manifest")
      continue;
    const applicationTag = _.find(manifestTag.children, x => x.name === "application")
    if (!applicationTag)
      continue;
    const mainActivityTag = _.find(applicationTag.children.filter(x => x.name === "activity"),
      x => x.children.filter(x => x.name === "intent-filter")
        .some(x => 
          x.children
            .some(x => x.name === "action" && x.attributes["android:name"] === "android.intent.action.MAIN") &&
          x.children
            .some(x => x.name === "category" && x.attributes["android:name"] === "android.intent.category.LAUNCHER")
        )
    );
    if (!mainActivityTag)
      continue;
    
    let mainActivityFullName = mainActivityTag.attributes["android:name"];
    if (!mainActivityFullName)
      continue;
    
    if (mainActivityFullName[0] === ".") {
      const packageName = manifestTag.attributes.package;
      if (!packageName)
        throw new Error("Incorrect manifest file. Package name must be defined.");

      mainActivityFullName = packageName + mainActivityFullName;
    }

    return mainActivityFullName;
  }

  throw new Error("Main activity is not found.");
}

async function readMainActivity(projectPath: string, sourceSets: ISourceSet[],
  mainActivityFullName: string): Promise<{ mainActivityPath: string, mainActivityContents: string }> {

  for (let sourceSet of sourceSets.filter(x => x.javaSrcDirs && x.javaSrcDirs.length)) {
    for (let javaSrcDir of sourceSet.javaSrcDirs) {
      let mainActivityPath = path.join(path.dirname(projectPath), javaSrcDir,
        mainActivityFullName.replace(/\./g, "/") + ".java");

      try {
        await fs.access(mainActivityPath, fs.constants.R_OK)
      } catch (err) {
        continue;
      }
      let mainActivityContents = await fs.readTextFile(mainActivityPath, "utf8");
      return {
        mainActivityPath,
        mainActivityContents
      }
    }
  }

  throw new Error("Main activity is not found.");
}

function analyze(code: string, activityName: string): CleanBag {

  let cleanBag = new CleanBag();
  let textWalker = new ActivityWalker<CleanBag>(code, cleanBag, activityName);

  // Collecting import statements
  textWalker.addTrap(
    bag =>
      bag.blockLevel === 0 &&
      textWalker.forepart.startsWith("import"),
    bag => {
      let regexp = /^import\s+com\s*.\s*microsoft\s*.\s*azure\s*.\s*mobile\s*.\s*(MobileCenter|analytics\s*.\s*Analytics|crashes\s*.\s*Crashes|distribute\s*.\s*Distribute)\s*;\s*?\n?/;
      let matches = textWalker.forepart.match(regexp);
      if (matches && matches[0]) {
        bag.importStatements.push({
          position: textWalker.position,
          text: matches[0],
          module: getModule(matches[1])
        });
      }
    }
  );

  // Start SDK statements
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      !bag.startSdkStatement &&
      textWalker.forepart.startsWith("MobileCenter"),
    bag => {
      let matches = removeComments(textWalker.forepart).match(/^MobileCenter\s*.\s*start\(/);
      if (matches && matches[0]) {
        bag.startSdkStatement = { 
          position: textWalker.position,
          text: matches[0],
          modules: MobileCenterSdkModule.None
        };
        bag.parenthesisLevel = 0;
      }
    }
  );

  // Tracking parenthesis
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      textWalker.currentChar === "(",
    bag =>
      bag.parenthesisLevel++
  );
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      textWalker.currentChar === ")",
    bag =>
      bag.parenthesisLevel--
  );

  // Collecting modules
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      bag.parenthesisLevel === 1 &&
      textWalker.forepart.startsWith("Analytics") &&
      /^Analytics\s*\.\s*class/.test(removeComments(textWalker.forepart)),
    bag =>
      bag.startSdkStatement.modules |= MobileCenterSdkModule.Analytics
  );
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      bag.parenthesisLevel === 1 &&
      textWalker.forepart.startsWith("Crashes") &&
      /^Crashes\s*\.\s*class/.test(removeComments(textWalker.forepart)),
    bag =>
      bag.startSdkStatement.modules |= MobileCenterSdkModule.Crashes
  );
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      bag.parenthesisLevel === 1 &&
      textWalker.forepart.startsWith("Distribute") &&
      /^Distribute\s*\.\s*class/.test(removeComments(textWalker.forepart)),
    bag =>
      bag.startSdkStatement.modules |= MobileCenterSdkModule.Distribute
  );

  // Catching ";"
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      bag.parenthesisLevel === 0 &&
      textWalker.currentChar === ";",
    bag => {
      let matches = textWalker.forepart.match(/^\s*;\s*/);
      bag.startSdkStatement.text = code.substring(bag.startSdkStatement.position, bag.startSdkStatement.position + matches[0].length);  
    }
  );

  // Stop
  textWalker.addTrap(
    bag =>
      bag.isWithinMethod === false,
    () =>
      textWalker.stop()
  );

  return textWalker.walk();
}

function getModule(moduleName: string): MobileCenterSdkModule {
  switch (true) {
    case /analytics\s*.\s*Analytics/.test(moduleName): return MobileCenterSdkModule.Analytics;
    case /crashes\s*.\s*Crashes/.test(moduleName): return MobileCenterSdkModule.Crashes;
    case /distribute\s*.\s*Distribute/.test(moduleName): return MobileCenterSdkModule.Distribute;
    default: return MobileCenterSdkModule.None;
  }
}

class CleanBag extends ActivityBag {
  parenthesisLevel: number;

  importStatements: IImportStatement[] = [];
  startSdkStatement: IStartSdkStatement;
}