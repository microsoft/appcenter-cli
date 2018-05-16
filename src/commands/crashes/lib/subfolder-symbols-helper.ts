import * as Path from "path";
import * as Fs from "fs";
import * as JsZip from "jszip";
import { inspect } from "util";
import { ErrorCodes, failure } from "../../../util/commandline";
import * as JsZipHelper from "../../../util/misc/jszip-helper";

export async function getSymbolsZipFromXcarchive(path: string, debug: Function) {
  // the DSYM folders from "*.xcarchive/dSYMs" should be compressed
  const dsymsFolderPath = Path.join(path, "dSYMs");
  return await packDsymParentFolderContents(dsymsFolderPath, debug);
}

export async function packDsymParentFolderContents(path: string, debug: Function): Promise<JsZip> {
  debug(`Compressing the dSYM sub-folders of ${path} to the in-memory ZIP archive`);
  const zipArchive = new JsZip();
  const childrenDsymFolders = getChildrenDsymFolderPaths(path, debug);
  for (const dSymPath of childrenDsymFolders) {
    try {
      debug(`Adding the sub-folder ${dSymPath} to the ZIP archive`);
      await JsZipHelper.addFolderToZipRecursively(dSymPath, zipArchive);
    } catch (error) {
      debug(`Unable to add folder ${dSymPath} to the ZIP archive - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `unable to add folder ${dSymPath} to the ZIP archive`);
    }
  }
  return zipArchive;
}

export function getChildrenDsymFolderPaths(parentPath: string, debug: Function): string[] {
  // get paths for all the DSym folders which belong to the specified folder
  let childrenEntriesList: string[];
  try {
    childrenEntriesList = Fs.readdirSync(parentPath);
  } catch (error) {
    debug(`error when looking into directory ${parentPath} content - ${inspect(error)}`);
    throw failure(ErrorCodes.Exception, `error when looking into directory ${parentPath} content`);
  }

  return childrenEntriesList
    .map((childPath) => Path.join(parentPath, childPath))
    .filter((childPath) => {
        if (Path.extname(childPath).toLowerCase() !== ".dsym") {
          return false;
        }
        try {
          const childStats = Fs.statSync(childPath);
          return childStats.isDirectory();
        } catch (error) {
          debug(`Error when getting statistics for the file ${parentPath} - ${inspect(error)}`);
          throw failure(ErrorCodes.Exception, `error when getting statistics for the file ${parentPath}`);
        }
    });
}
