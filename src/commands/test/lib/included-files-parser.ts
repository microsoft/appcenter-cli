import { IFileDescriptionJson, ITestCloudManifestJson } from "./test-manifest-reader";
import * as path from "path";
import * as pfs from "../../../util/misc/promisfied-fs";
import { validXmlFile } from "./xml-util";
import { out } from "../../../util/interaction";
import _ = require("lodash");

const invalidCharactersRegexp = /['"!#$%&+^<=>`|]/;

export async function copyIncludedFiles(manifest: ITestCloudManifestJson, include: string[], rootDir: string): Promise<ITestCloudManifestJson> {
  if (!include) {
    return manifest;
  }

  const includedFiles = this.parseIncludedFiles(include, rootDir);

  for (let i = 0; i < includedFiles.length; i++) {
    const includedFile = includedFiles[i];

    if (_.endsWith(includedFile.targetPath, ".dll.config")) {
      const assemblyName = includedFile.targetPath.slice(0, -7);
      const hasCorrespondingAssembly = manifest.files.indexOf(assemblyName) > -1 || include.indexOf(assemblyName) > -1;
      if (hasCorrespondingAssembly && !validXmlFile(includedFile.targetPath)) {
        out.text(`Warning: The XML config file ${includedFile.targetPath} was not a valid XML file. This file will not be uploaded.`);
        continue;
      }
    }

    const copyTarget = path.join(path.dirname(rootDir), includedFile.targetPath);
    await pfs.cp(includedFile.sourcePath, copyTarget);
    manifest.files.push(includedFile.targetPath);
  }

  return manifest;
}

export function parseIncludedFiles(includedFiles: string[], rootDir: string): IFileDescriptionJson[] {
  return includedFiles.map((f) => parseIncludedFile(f, rootDir));
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
