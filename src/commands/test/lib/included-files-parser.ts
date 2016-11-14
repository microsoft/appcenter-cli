import { IFileDescriptionJson } from "./test-manifest-reader";

export function parseIncludedFiles(includedFiles: string[]): IFileDescriptionJson[] {
  return includedFiles.map(f => parseIncludedFile(f));
}

function parseIncludedFile(includedFile: string): IFileDescriptionJson {
  let separatorIndex = includedFile.indexOf("=");
  if (separatorIndex === -1) {
    throw new Error(`Invalid definition of included files: ${includedFile}. Included files must specified in format "targetPath"="sourcePath"`);
  }

  return {
    targetPath: includedFile.substr(0, separatorIndex),
    sourcePath: includedFile.substr(separatorIndex + 1, includedFile.length - separatorIndex - 1)
  };
}