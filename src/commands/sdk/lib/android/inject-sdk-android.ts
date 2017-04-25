import injectSdkMainActivity from "./inject-sdk-main-activity";
import injectSdkBuildGradle from "./inject-sdk-build-gradle";
import { MobileCenterSdkModule } from "../mobilecenter-sdk-module";
import cleanSdkBuildGradle from "./clean-sdk-build-gradle";
import cleanSdkMainActivity from "./clean-sdk-main-activity";
import * as fs from "async-file";
import * as path from "path";
import * as _ from "lodash"
const xml2js = require("xml2js");
const gjs = require("gradlejs");

/**
 * Integrates Mobile Center SDK into a given android module
 * 
 * @param projectPath 
 * The path to the android module's build.gradle file
 * @param buildVariant 
 * The name of the build variant. 
 * It is used to calculate a sequence of the source sets to look at in order to find manifest files as well as java code files. 
 * @param sdkVersion 
 * The version of the Mobile Center SDK to integrate
 * @param appSecret 
 * The App Secret
 * @param sdkModules 
 * The argument of type enum (number) which uses three bits to hold flags. 
 * Each of the flags determines whether the corresponding Mobile Center SDK module is enabled or not.
 */

export default async function injectSdkAndroid(projectPath: string, buildVariantName: string, sdkVersion: string,
  appSecret: string, sdkModules: MobileCenterSdkModule): Promise<void> {

  if (!projectPath || !buildVariantName || !sdkVersion || !appSecret || !sdkModules)
    throw new Error("Invalid arguments");

  let buildGradleContents = await fs.readTextFile(projectPath, "utf8");

  const buildVariants = await getBuildVariants(buildGradleContents);
  const buildVariant = _.find(buildVariants, x => x.toString() === buildVariantName);
  if (!buildVariant)
    throw new Error("Incorrect build variant");

  const sourceSets = await getSourceSets(buildGradleContents, buildVariant);

  const mainActivityFullName = await getMainActivityName(projectPath, sourceSets);
  const mainActivityName = mainActivityFullName.match(/\w+$/)[0];
  let { mainActivityPath, mainActivityContents} = await readMainActivity(projectPath, sourceSets, mainActivityFullName);

  buildGradleContents = cleanSdkBuildGradle(buildGradleContents);
  buildGradleContents = injectSdkBuildGradle(buildGradleContents, sdkVersion, sdkModules);

  mainActivityContents = cleanSdkMainActivity(mainActivityContents, mainActivityName);
  mainActivityContents = injectSdkMainActivity(mainActivityContents, mainActivityName, appSecret, sdkModules);

  await fs.writeFile(projectPath, buildGradleContents, { encoding: "utf8" });
  await fs.writeFile(mainActivityPath, mainActivityContents, { encoding: "utf8" });
}

async function getBuildVariants(buildGradleContents: string): Promise<BuildVariant[]> {
  const matches = buildGradleContents.match(/(android\s*{[^]*})/);
  let buildGradle = await gjs.parseText(matches && matches.length ? matches[0] : buildGradleContents);

  let buildTypes: string[] = ["debug", "release"];
  let productFlavors: string[];
  if (buildGradle && buildGradle.android) {
    if (buildGradle.android.buildTypes) {
      Object.keys(buildGradle.android.buildTypes).forEach((buildType: string) => {
        if (!_.includes(buildTypes, buildType) && buildType.trim()) {
          buildTypes.push(buildType);
        }
      });
    }

    if (buildGradle.android.productFlavors) { //TODO: handle flavorDimensions & variantFilters
      productFlavors = Object.keys(buildGradle.android.productFlavors).filter(x => x.trim());
    }
  }

  let buildVariants: BuildVariant[];
  if (!productFlavors || !productFlavors.length) {
    buildVariants = buildTypes.map(x => new BuildVariant(x));
  } else {
    buildVariants = [];
    productFlavors.forEach((productFlavor: string) => {
      buildTypes.forEach((buildType: string) => {
        buildVariants.push(new BuildVariant(buildType, [productFlavor])); //TODO: handle flavorDimensions
      });
    });
  }

  return buildVariants;
}

async function getSourceSets(buildGradleContents: string, buildVariant: BuildVariant): Promise<ISourceSet[]> {
  let sourceSets: ISourceSet[] = []

  sourceSets.push({ name: buildVariant.toString() });
  if (buildVariant.productFlavors && buildVariant.productFlavors.length) {
    sourceSets.push({ name: buildVariant.buildType });
    sourceSets.push(...buildVariant.productFlavors.map(x => ({ name: x })));
  }
  sourceSets.push({ name: "main" });

  const matches = buildGradleContents.match(/(android\s*{[^]*})/);
  let buildGradle = await gjs.parseText(matches && matches.length ? matches[0] : buildGradleContents);

  if (buildGradle && buildGradle.android && buildGradle.android.sourceSets) {
    Object.keys(buildGradle.android.sourceSets).forEach((sourceSetName: string) => {
      let sourceSet = _.find(sourceSets, x => x.name === sourceSetName);
      if (sourceSet) {
        sourceSet.manifestSrcFile = buildGradle.android.sourceSets[sourceSetName]["manifest.srcFile"];
        sourceSet.javaSrcDirs = buildGradle.android.sourceSets[sourceSetName]["java.srcDirs"];
      }
    });
  }

  sourceSets.forEach(sourceSet => {
    sourceSet.manifestSrcFile = sourceSet.manifestSrcFile ?
      removeQuotes(sourceSet.manifestSrcFile) :
      `src/${sourceSet.name}/AndroidManifest.xml`;
    sourceSet.javaSrcDirs = sourceSet.javaSrcDirs && sourceSet.javaSrcDirs.length ?
      sourceSet.javaSrcDirs.map(removeQuotes) :
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
    const xml = await readXml(manifestContents);
    if (!xml || !xml.manifest || !xml.manifest.application || !xml.manifest.application[0])
      continue;

    const packageName = xml.manifest.$.package;
    const application = xml.manifest.application[0];
    if (!application.activity || !application.activity.length)
      continue;

    const mainActivity = _.find<any>(application.activity, x =>
      x["intent-filter"] && x["intent-filter"][0] &&
      x["intent-filter"][0].action && x["intent-filter"][0].action[0] &&
      x["intent-filter"][0].action[0].$["android:name"] === "android.intent.action.MAIN" &&
      x["intent-filter"][0].category && x["intent-filter"][0].category.length &&
      _.some(x["intent-filter"][0].category, (x: any) => x.$["android:name"] === "android.intent.category.LAUNCHER")
    );
    if (!mainActivity)
      continue;

    let mainActivityFullName = mainActivity.$["android:name"];
    if (!mainActivityFullName)
      continue;
    if (mainActivityFullName[0] === ".") {
      if (!packageName)
        throw new Error("Incorrect manifest file. Package name must be defined.");

      mainActivityFullName = packageName + mainActivityFullName;
    }

    return mainActivityFullName;
  }

  throw new Error("Main activity is not found.");
}

async function readXml(xmlContents: string): Promise<any> {
  return new Promise<any>(function (resolve, reject) {
    xml2js.parseString(xmlContents, function (err: any, data: any) {
      if (err)
        reject(err);
      resolve(data);
    });
  });
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

class BuildVariant {
  constructor(
    public buildType: string,
    public productFlavors?: string[]) { }

  toString(): string {
    let result = this.buildType;
    if (this.productFlavors)
      this.productFlavors.forEach(pf => result = pf + result.substr(0, 1).toLocaleUpperCase() + result.substr(1));
    return result;
  }
}

interface ISourceSet {
  name: string;
  manifestSrcFile?: string;
  javaSrcDirs?: string[];
}

