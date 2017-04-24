import * as _ from "lodash"
import * as fs from "async-file";

import { CodeBag, CodeWalker } from "../util/code-walker";
import { IBuildGradle, IBuildVariant, IDependenciesBlock, ISourceSet } from './models/build-gradle';

const gjs = require("gradlejs");



export default async function collectBuildGradleInfo(buildGradlePath: string): Promise<IBuildGradle> {
  let contents = await fs.readTextFile(buildGradlePath, "utf8");

  const buildVariants = await getBuildVariants(contents);
  const sourceSets = await getSourceSets(contents);

  const info = analyze(contents);

  return {
    path: buildGradlePath,
    contents,
    buildVariants,
    sourceSets,
    dependenciesBlocks: info.dependenciesBlocks
  };
}

async function getBuildVariants(buildGradleContents: string): Promise<IBuildVariant[]> {
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
      productFlavors = Object.keys(buildGradle.android.productFlavors).filter(x => x && x.trim());
    }
  }

  let buildVariants: IBuildVariant[];
  if (!productFlavors || !productFlavors.length) {
    buildVariants = buildTypes.map(x => getBuildVariant(x));
  } else {
    buildVariants = [];
    productFlavors.forEach(productFlavor => {
      buildTypes.forEach(buildType => {
        buildVariants.push(getBuildVariant(buildType, [productFlavor])); //TODO: handle flavorDimensions
      });
    });
  }

  return buildVariants;
}

function getBuildVariant(buildType: string, productFlavors?: string[]): IBuildVariant {
  let name = buildType;
  if (productFlavors) {
    productFlavors.forEach(pf => name = pf + name[0].toLocaleUpperCase() + name.substr(1));
    return {
      name,
      buildType,
      productFlavors
    };
  } else {
    return {
      name,
      buildType
    };
  }
}

async function getSourceSets(buildGradleContents: string): Promise<ISourceSet[]> {
  const matches = buildGradleContents.match(/(android\s*{[^]*})/);
  let buildGradle = await gjs.parseText(matches && matches.length ? matches[0] : buildGradleContents);

  const sourceSets: ISourceSet[] = [];
  if (buildGradle && buildGradle.android && buildGradle.android.sourceSets) {
    for (let sourceSet of Object.keys(buildGradle.android.sourceSets)) {
      let matches = /[^\.]+/.exec(sourceSet);
      if (matches && matches[0] && !sourceSets.some(ss => ss.name === matches[0]))
        sourceSets.push({ name: matches[0] });
    }
    for (let sourceSet of sourceSets) {
      if (buildGradle.android.sourceSets[sourceSet.name] && buildGradle.android.sourceSets[sourceSet.name]["manifest.srcFile"])
        sourceSet.manifestSrcFile = buildGradle.android.sourceSets[sourceSet.name]["manifest.srcFile"];
      else if (buildGradle.android.sourceSets[sourceSet.name + ".manifest.srcFile"])
        sourceSet.manifestSrcFile = buildGradle.android.sourceSets[sourceSet.name + ".manifest.srcFile"];
      
      if (buildGradle.android.sourceSets[sourceSet.name] && buildGradle.android.sourceSets[sourceSet.name]["java.srcDirs"])
        sourceSet.javaSrcDirs = buildGradle.android.sourceSets[sourceSet.name]["java.srcDirs"];
      else if (buildGradle.android.sourceSets[sourceSet.name + ".java.srcDirs"])
        sourceSet.javaSrcDirs = buildGradle.android.sourceSets[sourceSet.name + ".java.srcDirs"];
    }
  }

  return sourceSets;
}

function analyze(contents: string): CleanBag {
  let cleanBag = new CleanBag();
  let walker = new CodeWalker<CleanBag>(contents, cleanBag);

  // Collecting dependencies blocks
  walker.addTrap(
    bag =>
      bag.blockLevel === 1 &&
      !bag.currentBlock &&
      walker.prevChar === "{",
    bag => {
      let matches = walker.backpart.match(/dependencies\s*{$/);
      if (matches && matches[0]) {
        bag.currentBlock = {
          position: walker.position,
          text: "",
          defs: [],
          compiles: []
        };
      }
    }
  );
  walker.addTrap(
    bag =>
      bag.blockLevel === 1 &&
      bag.currentBlock &&
      walker.nextChar === "}",
    bag => {
      if (bag.currentBlock.compiles.length) {
        bag.currentBlock.text = contents.substring(bag.currentBlock.position, walker.position + 1);
        bag.dependenciesBlocks.push(bag.currentBlock);
      }
      bag.currentBlock = null;
    }
  );

  // Catching defs
  walker.addTrap(
    bag =>
      bag.currentBlock &&
      walker.forepart.startsWith("def"),
    bag => {
      let matches = walker.forepart.match(/^def\s+(\w+)\s*=\s*["'](.+?)["']/);
      if (matches && matches[1] && matches[2])
        bag.currentBlock.defs.push({
          text: matches[0],
          name: matches[1],
          value: matches[2],
          position: walker.position - bag.currentBlock.position
        });
    }
  );

  // Catching compiles
  walker.addTrap(
    bag =>
      bag.currentBlock &&
      walker.forepart.startsWith("compile"),
    bag => {
      let matches = walker.forepart.match(/^compile\s*["']com.microsoft.azure.mobile:mobile-center-(analytics|crashes|distribute|push):[^]+?["']/);
      if (matches && matches[1])
        bag.currentBlock.compiles.push({
          text: matches[0],
          moduleName: matches[1],
          position: walker.position - bag.currentBlock.position
        });
    }
  );

  return walker.walk();
}

class CleanBag extends CodeBag {
  currentBlock: IDependenciesBlock;
  dependenciesBlocks: IDependenciesBlock[] = [];
}