import * as fs from 'fs';
import * as path from 'path';
import { injectSdkMainActivity } from "./inject-sdk-main-activity";
import { injectSdkBuildGradle } from "./inject-sdk-build-gradle";
import { MobileCenterSdkModule } from "../mobilecenter-sdk-module";
import * as _ from 'lodash'
import { cleanSdkBuildGradle } from "./clean-sdk-build-gradle";
import { cleanSdkMainActivity } from "./clean-sdk-main-activity";
const xml2js = require('xml2js');
const gjs = require('gradlejs');

/**
 * Integrates Mobile Center SDK into the given android module
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

export function injectSdkAndroid(projectPath: string, buildVariant: string, sdkVersion: string,
  appSecret: string, sdkModules: MobileCenterSdkModule): Promise<void> {

  if (!projectPath || !buildVariant || !sdkVersion || !appSecret || !sdkModules)
    return Promise.reject(new Error("Invalid arguments."));

  return Promise.resolve({ projectPath, buildVariant })
    .then(readBuildGradle)
    .then(fillBuildVariants)
    .then(fillSourceSets)
    .then(selectMainActivity)
    .then(readMainActivity)
    .then(function (moduleInfo: IAndroidModuleInfo) {
      return injectBuildGradle(moduleInfo, sdkVersion, sdkModules);
    })
    .then(function (moduleInfo: IAndroidModuleInfo) {
      return injectMainActivity(moduleInfo, appSecret, sdkModules);
    })
    .then(saveChanges);
}

function readBuildGradle(moduleInfo: IAndroidModuleInfo): Promise<IAndroidModuleInfo> {
  return new Promise<IAndroidModuleInfo>(function (resolve, reject) {
    moduleInfo.buildGradlePath = moduleInfo.projectPath;

    fs.exists(moduleInfo.buildGradlePath, function (exists: boolean) {
      if (!exists)
        return reject(new Error('The module\'s build.gradle file is not found.'));

      fs.readFile(moduleInfo.buildGradlePath, 'utf8', function (err, data: string) {
        if (err)
          reject(err);
        moduleInfo.buildGradleContents = data;
        resolve(moduleInfo);
      });
    });
  });
}

function fillBuildVariants(moduleInfo: IAndroidModuleInfo): Promise<IAndroidModuleInfo> {
  const matches = moduleInfo.buildGradleContents.match(/(android\s*{[^]*})/);
  return gjs.parseText(matches && matches.length ? matches[0] : moduleInfo.buildGradleContents)
    .then((representation: any) => {
      let buildTypes: string[] = ['debug', 'release'];
      let productFlavors: string[];
      if (representation && representation.android) {
        if (representation.android.buildTypes) {
          Object.keys(representation.android.buildTypes).forEach((buildType: string) => {
            if (!_.includes(buildTypes, buildType) && buildType.trim()) {
              buildTypes.push(buildType);
            }
          });
        }

        if (representation.android.productFlavors) { //TODO: handle flavorDimensions & variantFilters
          productFlavors = Object.keys(representation.android.productFlavors).filter(x => x.trim());
        }
      }

      if (!productFlavors || !productFlavors.length) {
        moduleInfo.buildVariants = buildTypes.map(x => new BuildVariant(x));
      } else {
        moduleInfo.buildVariants = [];
        productFlavors.forEach((productFlavor: string) => {
          buildTypes.forEach((buildType: string) => {
            moduleInfo.buildVariants.push(new BuildVariant(buildType, [productFlavor])); //TODO: handle flavorDimensions
          });
        });
      }
      return moduleInfo;
    });
}

function fillSourceSets(moduleInfo: IAndroidModuleInfo): Promise<IAndroidModuleInfo> {
  let buildVariant = _.find(moduleInfo.buildVariants, x => x.toString() === moduleInfo.buildVariant);
  if (!buildVariant)
    return Promise.reject(new Error('Incorrect build variant.'));
  moduleInfo.sourceSets = [];
  moduleInfo.sourceSets.push({ name: buildVariant.toString() });
  if (buildVariant.productFlavors && buildVariant.productFlavors.length) {
    moduleInfo.sourceSets.push({ name: buildVariant.buildType });
    moduleInfo.sourceSets.push(...buildVariant.productFlavors.map(x => ({ name: x })));
  }
  moduleInfo.sourceSets.push({ name: 'main' });
  const matches = moduleInfo.buildGradleContents.match(/(android\s*{[^]*})/);
  return gjs.parseText(matches && matches.length ? matches[0] : moduleInfo.buildGradleContents)
    .then((representation: any) => {
      if (representation && representation.android && representation.android.sourceSets) {
        Object.keys(representation.android.sourceSets).forEach((sourceSetName: string) => {
          let sourceSet = _.find(moduleInfo.sourceSets, x => x.name === sourceSetName);
          if (sourceSet) {
            sourceSet.manifestSrcFile = representation.android.sourceSets[sourceSetName]['manifest.srcFile'];
            sourceSet.javaSrcDirs = representation.android.sourceSets[sourceSetName]['java.srcDirs'];
          }
        });
      }

      moduleInfo.sourceSets.forEach(sourceSet => {
        sourceSet.manifestSrcFile = sourceSet.manifestSrcFile ?
          removeQuotes(sourceSet.manifestSrcFile) :
          `src/${sourceSet.name}/AndroidManifest.xml`;
        sourceSet.javaSrcDirs = sourceSet.javaSrcDirs && sourceSet.javaSrcDirs.length ?
          sourceSet.javaSrcDirs.map(removeQuotes) :
          [`src/${sourceSet.name}/java`];
      });

      return moduleInfo;
    });
}

function removeQuotes(text: string): string {
  let matches = text.trim().match(/^['"]([^]*)['"]$/);
  return matches && matches[1] ? matches[1] : '';
}

function selectMainActivity(moduleInfo: IAndroidModuleInfo): Promise<IAndroidModuleInfo> {

  let promise = Promise.resolve(undefined);
  for (let sourceSet of moduleInfo.sourceSets) {
    promise = promise.then(function (isFound: boolean) {
      if (isFound)
        return Promise.resolve(true);
      let manifestPath = path.join(path.dirname(moduleInfo.projectPath), sourceSet.manifestSrcFile);
      return new Promise<boolean>(function (resolve, reject) {
        fs.exists(manifestPath, function (exists: boolean) {
          if (!exists)
            return resolve(false);

          fs.readFile(manifestPath, 'utf8', function (err: NodeJS.ErrnoException, data: string) {
            if (err)
              return reject(err);

            xml2js.parseString(data, function (err: any, xml: any) {

              if (err)
                return reject(err);

              if (!xml || !xml.manifest || !xml.manifest.application || !xml.manifest.application[0])
                return resolve(false);

              let packageName = xml.manifest.$.package;
              let application = xml.manifest.application[0];
              if (!application.activity || !application.activity.length)
                return resolve(false);

              let mainActivity = _.find<any>(application.activity, x =>
                x['intent-filter'] && x['intent-filter'][0] &&
                x['intent-filter'][0].action && x['intent-filter'][0].action[0] &&
                x['intent-filter'][0].action[0].$['android:name'] === 'android.intent.action.MAIN' &&
                x['intent-filter'][0].category && x['intent-filter'][0].category.length &&
                _.some(x['intent-filter'][0].category, (x: any) => x.$['android:name'] === 'android.intent.category.LAUNCHER')
              );
              if (!mainActivity)
                return resolve(false);

              let mainActivityFullName = mainActivity.$['android:name'];
              if (!mainActivityFullName)
                return resolve(false);
              if (mainActivityFullName[0] === '.') {
                if (!packageName)
                  return reject(new Error('Incorrect manifest file. Package name must be specified.'));

                mainActivityFullName = packageName + mainActivityFullName;
              }

              moduleInfo.mainActivityFullName = mainActivityFullName;
              moduleInfo.mainActivityName = mainActivityFullName.match(/\w+$/)[0];
              resolve(true);
            });
          });
        });
      });
    });
  }

  return promise.
    then(function (isFound: boolean) {
      if (!isFound)
        throw new Error('Main activity is not found.');
      return moduleInfo;
    });
}

function readMainActivity(moduleInfo: IAndroidModuleInfo): Promise<IAndroidModuleInfo> {

  let promise = Promise.resolve(undefined);
  for (let sourceSet of moduleInfo.sourceSets.filter(x => x.javaSrcDirs && x.javaSrcDirs.length)) {
    for (let javaSrcDir of sourceSet.javaSrcDirs)
      promise = promise.then(function (isFound: boolean) {
        if (isFound)
          return Promise.resolve(true);

        let mainActivityPath = path.join(path.dirname(moduleInfo.projectPath), javaSrcDir,
          moduleInfo.mainActivityFullName.replace(/\./g, '/') + '.java');
        return new Promise<boolean>(function (resolve, reject) {
          fs.exists(mainActivityPath, function (exists: boolean) {
            if (!exists)
              return resolve(false);

            fs.readFile(mainActivityPath, 'utf8', function (err, data: string) {
              if (err)
                return reject(err);
              moduleInfo.mainActivityPath = mainActivityPath;
              moduleInfo.mainActivityContents = data;
              resolve(true);
            });
          });
        });
      });
  }

  return promise.
    then(function (isFound: boolean) {
      if (!isFound)
        throw new Error('Main activity file not found.');
      return moduleInfo;
    });
}

function injectBuildGradle(moduleInfo: IAndroidModuleInfo, sdkVersion: string, sdkModules: MobileCenterSdkModule): Promise<IAndroidModuleInfo> {
  let lines: string[] = [];
  if (sdkModules) {
    lines.push('dependencies {');
    lines.push(`    def mobileCenterSdkVersion = '${sdkVersion}'`);
    if (sdkModules & MobileCenterSdkModule.Analytics)
      lines.push('    compile "com.microsoft.azure.mobile:mobile-center-analytics:${mobileCenterSdkVersion}"');
    if (sdkModules & MobileCenterSdkModule.Crashes)
      lines.push('    compile "com.microsoft.azure.mobile:mobile-center-crashes:${mobileCenterSdkVersion}"');
    if (sdkModules & MobileCenterSdkModule.Distribute)
      lines.push('    compile "com.microsoft.azure.mobile:mobile-center-distribute:${mobileCenterSdkVersion}"');
    lines.push('}');
  }

  try {
    let cleanedCode = cleanSdkBuildGradle(moduleInfo.buildGradleContents);
    moduleInfo.buildGradleContents = injectSdkBuildGradle(cleanedCode, lines);
  } catch (err) {
    return Promise.reject(err);
  }
  return Promise.resolve(moduleInfo);
}

function injectMainActivity(moduleInfo: IAndroidModuleInfo, appSecret: string, sdkModules: MobileCenterSdkModule): Promise<IAndroidModuleInfo> {
  let importStatements: string[] = [];
  let sdkModulesList: string[] = [];
  if (sdkModules)
    importStatements.push('import com.microsoft.azure.mobile.MobileCenter;');
  if (sdkModules & MobileCenterSdkModule.Analytics) {
    importStatements.push('import com.microsoft.azure.mobile.analytics.Analytics;');
    sdkModulesList.push('Analytics.class');
  }
  if (sdkModules & MobileCenterSdkModule.Crashes) {
    importStatements.push('import com.microsoft.azure.mobile.crashes.Crashes;');
    sdkModulesList.push('Crashes.class');
  }
  if (sdkModules & MobileCenterSdkModule.Distribute) {
    importStatements.push('import com.microsoft.azure.mobile.distribute.Distribute;');
    sdkModulesList.push('Distribute.class');
  }

  let startSdkStatements: string[] = [];
  startSdkStatements.push(`MobileCenter.start(getApplication(), "${appSecret}",`);
  startSdkStatements.push(`        ${sdkModulesList.join(', ')});`);

  try {
    let cleanedCode = cleanSdkMainActivity(moduleInfo.mainActivityContents, moduleInfo.mainActivityName);
    moduleInfo.mainActivityContents = injectSdkMainActivity(cleanedCode,
      moduleInfo.mainActivityName, importStatements, startSdkStatements);
  } catch (err) {
    return Promise.reject(err);
  }
  return Promise.resolve(moduleInfo);
}

function saveChanges(moduleInfo: IAndroidModuleInfo): Promise<void> {
  return Promise.resolve(undefined)
    .then(() => new Promise(function (resolve, reject) {
      fs.writeFile(moduleInfo.buildGradlePath, moduleInfo.buildGradleContents, function (err) {
        if (err)
          reject(err);
        resolve();
      });
    }))
    .then(() => new Promise(function (resolve, reject) {
      fs.writeFile(moduleInfo.mainActivityPath, moduleInfo.mainActivityContents, function (err) {
        if (err)
          reject(err);
        resolve();
      });
    }));
}

interface IAndroidModuleInfo {
  projectPath: string;
  buildVariant: string;

  buildVariants?: IBuildVariant[];
  sourceSets?: ISourceSet[];

  buildGradlePath?: string;
  buildGradleContents?: string;
  mainActivityPath?: string;
  mainActivityContents?: string;
  mainActivityName?: string;
  mainActivityFullName?: string;
}

interface IBuildVariant {
  buildType: string;
  productFlavors?: string[];
}

class BuildVariant implements IBuildVariant {
  constructor(
    public buildType: string,
    public productFlavors?: string[]) { }

  toString(): string {
    let result = this.buildType;
    if (this.productFlavors)
      this.productFlavors.forEach(pf => result = pf + result.substr(0, 1).toLocaleUpperCase() + result.substr(1)); //inverse the order?
    return result;
  }
}

interface ISourceSet {
  name: string;
  manifestSrcFile?: string;
  javaSrcDirs?: string[];
}

