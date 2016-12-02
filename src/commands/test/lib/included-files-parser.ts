import { IFileDescriptionJson } from "./test-manifest-reader";
import * as path from "path";

const invalidCharactersRegexp = /['"!#$%&+^<=>`|]/

export function parseIncludedFiles(includedFiles: string[], rootDir: string): IFileDescriptionJson[] {
  return includedFiles.map(f => parseIncludedFile(f, rootDir));
}

function parseIncludedFile(includedFile: string, rootDir: string): IFileDescriptionJson {
  let separatorIndex = includedFile.indexOf("=");
  if (separatorIndex === -1) {
    return parseIncludedFileFromSinglePath(includedFile, rootDir);
  }
  else {
    return parseIncludedFileFromPathsPair(includedFile, rootDir, separatorIndex);
  }
}

function parseIncludedFileFromSinglePath(includedFile: string, rootDir: string): IFileDescriptionJson {
  validatePath(includedFile);

  if (path.isAbsolute(includedFile)) {
    let targetPath = path.relative(rootDir, includedFile);
    if (targetPath.indexOf("..") != -1) {
      throw new Error(`Invalid included file: "${includedFile}". ` + 
                      `If only a single path is used, it must be inside directory "${rootDir}"`);
    }

    return {
      targetPath: path.relative(rootDir, includedFile),
      sourcePath: includedFile
    }
  }
  else {
    return {
      targetPath: includedFile,
      sourcePath: path.join(rootDir, includedFile)
    }
  }
}

function parseIncludedFileFromPathsPair(includedFile: string, rootDir: string, separatorIndex: number): IFileDescriptionJson {
  let targetPath = includedFile.substr(0, separatorIndex);
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