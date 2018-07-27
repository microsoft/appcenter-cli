import { IFileDescriptionJson, ITestCloudManifestJson } from "./test-manifest-reader";
import * as path from "path";
import * as pfs from "../../../util/misc/promisfied-fs";
import { validXmlFile } from "./xml-util";
import { out } from "../../../util/interaction";
import _ = require("lodash");

const invalidCharactersRegexp = /['"!#$%&+^<=>`|]/;

export async function processIncludedFiles(manifest: ITestCloudManifestJson, include: string[], destinationDir: string, sourceRootDir: string) {
  if (!include) {
    return;
  }

  const filteredFiles = this.filterIncludedFiles(manifest.files, include);
  const includedFiles = this.parseIncludedFiles(filteredFiles, sourceRootDir);
  await this.copyIncludedFiles(manifest, includedFiles, destinationDir);
}

export async function copyIncludedFiles(manifest: ITestCloudManifestJson, includedFiles: IFileDescriptionJson[], destinationDir: string) {
  for (const includedFile of includedFiles) {
    const copyTarget = path.join(destinationDir, includedFile.targetPath);
    await pfs.cp(includedFile.sourcePath, copyTarget);
    manifest.files.push(includedFile.targetPath);
  }
}

export function parseIncludedFiles(includedFiles: string[], rootDir: string): IFileDescriptionJson[] {
  return includedFiles.map((f) => parseIncludedFile(f, rootDir));
}

export function filterIncludedFiles(manifestFiles: string[], include: string[]): string[] {
  if (!include) {
    return [];
  }

  const allFiles = manifestFiles.concat(include);
  return include.filter((f) => validFile(f, allFiles));
}

function validFile(fileName: string, allIncludedFiles: string[]) : boolean {
  if (_.endsWith(fileName, ".dll.config")) {
    const assemblyName = fileName.slice(0, -7);
    const hasCorrespondingAssembly = allIncludedFiles.indexOf(assemblyName) > -1;
    if (hasCorrespondingAssembly && !validXmlFile(fileName)) {
      out.text(`Warning: The XML config file ${fileName} was not a valid XML file. This file will not be uploaded.`);
      return false;
    }
  }

  return true;
}

function parseIncludedFile(includedFile: string, rootDir: string): IFileDescriptionJson {
  const separatorIndex = includedFile.indexOf("=");
  if (separatorIndex === -1) {
    return parseIncludedFileFromSinglePath(includedFile, rootDir);
  } else {
    return parseIncludedFileFromPathsPair(includedFile, rootDir, separatorIndex);
  }
}

function parseIncludedFileFromSinglePath(includedFile: string, rootDir: string): IFileDescriptionJson {
  validatePath(includedFile);

  if (path.isAbsolute(includedFile)) {
    const targetPath = path.relative(rootDir, includedFile);
    if (targetPath.indexOf("..") !== -1) {
      throw new Error(`Invalid included file: "${includedFile}". ` +
        `If only a single path is used, it must be inside directory "${rootDir}"`);
    }

    return {
      targetPath: path.relative(rootDir, includedFile),
      sourcePath: includedFile
    };
  } else {
    return {
      targetPath: includedFile,
      sourcePath: path.join(rootDir, includedFile)
    };
  }
}

function parseIncludedFileFromPathsPair(includedFile: string, rootDir: string, separatorIndex: number): IFileDescriptionJson {
  const targetPath = includedFile.substr(0, separatorIndex);
  let sourcePath = includedFile.substr(separatorIndex + 1, includedFile.length - separatorIndex - 1);

  validatePath(targetPath);
  validatePath(sourcePath);

  if (path.isAbsolute(targetPath)) {
    throw new Error(`Invalid included file: "${includedFile}". Target path must be relative`);
  }

  if (!path.isAbsolute(sourcePath)) {
    sourcePath = path.join(rootDir, sourcePath);
  }

  return {
    targetPath: targetPath,
    sourcePath: sourcePath
  };
}

function validatePath(possiblePath: string) {
  if (invalidCharactersRegexp.test(possiblePath)) {
    throw new Error(`Invalid path: "${possiblePath}"`);
  }
}
