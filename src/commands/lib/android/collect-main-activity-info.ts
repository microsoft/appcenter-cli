import * as _ from "lodash"
import * as fs from "async-file";
import * as path from "path";

import { ActivityBag, ActivityWalker } from "./activity-walker";
import { IBuildGradle, IBuildVariant, ISourceSet } from './models/build-gradle';
import { IImportStatement, IMainActivity, IStartSdkStatement } from "./models/main-activity";
import { XmlBag, XmlWalker } from "../util/xml-walker";

import { MobileCenterSdkModule } from "../models/mobilecenter-sdk-module";

export default async function collectMainActivityInfo(buildGradle: IBuildGradle, buildVariantName: string): Promise<IMainActivity> {
  const buildVariant = _.find(buildGradle.buildVariants, x => x.name.toLowerCase() === buildVariantName.toLowerCase());
  if (!buildVariant)
    throw new Error("Incorrect build variant");

  const sourceSets = getSourceSets(buildGradle, buildVariant);
  const fullName = await getMainActivityName(buildGradle.path, sourceSets);
  const name = fullName.match(/\w+$/)[0];
  const { mainActivityPath, mainActivityContents} = 
    await readMainActivity(buildGradle.path, sourceSets, fullName);
  
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

function getSourceSets(buildGradle: IBuildGradle, buildVariant: IBuildVariant): ISourceSet[] {
  let sourceSets: ISourceSet[] = []

  sourceSets.push({ name: buildVariant.name });
  if (buildVariant.productFlavors && buildVariant.productFlavors.length) {
    sourceSets.push({ name: buildVariant.buildType });
    sourceSets.push(...buildVariant.productFlavors.map(x => ({ name: x })));
  }
  sourceSets.push({ name: "main" });

  sourceSets.forEach(sourceSet => {
    let buildGradleSourceSet = _(buildGradle.sourceSets).find(ss => ss.name === sourceSet.name);
    
    sourceSet.manifestSrcFile = buildGradleSourceSet && buildGradleSourceSet.manifestSrcFile ?
      removeQuotes(buildGradleSourceSet.manifestSrcFile) :
      `src/${sourceSet.name}/AndroidManifest.xml`;
    
    sourceSet.javaSrcDirs = buildGradleSourceSet && buildGradleSourceSet.javaSrcDirs && buildGradleSourceSet.javaSrcDirs.length ?
      buildGradleSourceSet.javaSrcDirs.map(removeQuotes) :
      [`src/${sourceSet.name}/java`];
  });

  return sourceSets;
}

function removeQuotes(text: string): string {
  let matches = text.trim().match(/^(['"])([^]*)\1$/);
  return matches && matches[2] ? matches[2] : "";
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
        .some(x => x.children.some(x => x.name === "action" && x.attributes["android:name"] === "android.intent.action.MAIN"))
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
  let walker = new ActivityWalker<CleanBag>(code, cleanBag, activityName);

  // Collecting import statements
  walker.addTrap(
    bag =>
      bag.blockLevel === 0 &&
      walker.forepart.startsWith("import"),
    bag => {
      let regexp = /^import\s+com\s*.\s*microsoft\s*.\s*azure\s*.\s*mobile\s*.\s*(MobileCenter|analytics\s*.\s*Analytics|crashes\s*.\s*Crashes|distribute\s*.\s*Distribute|push\s*.\s*Push)\s*;\s*?\n?/;
      let matches = walker.forepart.match(regexp);
      if (matches && matches[0]) {
        bag.importStatements.push({
          position: walker.position,
          text: matches[0],
          module: getModule(matches[1])
        });
      }
    }
  );

  // Start SDK statements
  walker.addTrap(
    bag =>
      bag.isWithinMethod &&
      !bag.startSdkStatement &&
      walker.forepart.startsWith("MobileCenter"),
    bag => {
      let matches = walker.forepart.match(/^MobileCenter\s*.\s*start\(/);
      if (matches && matches[0]) {
        bag.startSdkStatement = { 
          position: walker.position,
          text: matches[0],
          modules: MobileCenterSdkModule.None
        };
        bag.parenthesisLevel = 0;
      }
    }
  );

  // Tracking parenthesis
  walker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      walker.currentChar === "(",
    bag =>
      bag.parenthesisLevel++
  );
  walker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      walker.currentChar === ")",
    bag =>
      bag.parenthesisLevel--
  );

  // Collecting modules
  walker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      bag.parenthesisLevel === 1 &&
      walker.forepart.startsWith("Analytics") &&
      /^Analytics\s*\.\s*class/.test(walker.forepart),
    bag =>
      bag.startSdkStatement.modules |= MobileCenterSdkModule.Analytics
  );
  walker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      bag.parenthesisLevel === 1 &&
      walker.forepart.startsWith("Crashes") &&
      /^Crashes\s*\.\s*class/.test(walker.forepart),
    bag =>
      bag.startSdkStatement.modules |= MobileCenterSdkModule.Crashes
  );
  walker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      bag.parenthesisLevel === 1 &&
      walker.forepart.startsWith("Distribute") &&
      /^Distribute\s*\.\s*class/.test(walker.forepart),
    bag =>
      bag.startSdkStatement.modules |= MobileCenterSdkModule.Distribute
  );
  walker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      bag.parenthesisLevel === 1 &&
      walker.forepart.startsWith("Push") &&
      /^Push\s*\.\s*class/.test(walker.forepart),
    bag =>
      bag.startSdkStatement.modules |= MobileCenterSdkModule.Push
  );

  // Catching ";"
  walker.addTrap(
    bag =>
      bag.isWithinMethod &&
      bag.startSdkStatement &&
      bag.parenthesisLevel === 0 &&
      walker.currentChar === ";",
    bag => {
      const matches = walker.forepart.match(/^;[ \t\r]*(?:\n[ \t\r]*)?/);
      bag.startSdkStatement.text = code.substring(bag.startSdkStatement.position, walker.position + matches[0].length);
      walker.stop()
    }
  );

  return walker.walk();
}

function getModule(moduleName: string): MobileCenterSdkModule {
  switch (true) {
    case /analytics\s*.\s*Analytics/.test(moduleName): return MobileCenterSdkModule.Analytics;
    case /crashes\s*.\s*Crashes/.test(moduleName): return MobileCenterSdkModule.Crashes;
    case /distribute\s*.\s*Distribute/.test(moduleName): return MobileCenterSdkModule.Distribute;
    case /push\s*.\s*Push/.test(moduleName): return MobileCenterSdkModule.Push;
    default: return MobileCenterSdkModule.None;
  }
}

class CleanBag extends ActivityBag {
  parenthesisLevel: number;

  importStatements: IImportStatement[] = [];
  startSdkStatement: IStartSdkStatement;
}