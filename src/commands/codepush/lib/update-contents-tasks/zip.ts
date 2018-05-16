import * as fs from "fs";
import * as pfs from "../../../../util/misc/promisfied-fs";
import * as path from "path";
import * as yazl from "yazl";
import { generateRandomFilename, normalizePath, isDirectory } from "../file-utils";

interface ReleaseFile {
  sourceLocation: string; // The current location of the file on disk
  targetLocation: string; // The desired location of the file within the zip
}

export default function zip(updateContentsPath: string): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    const releaseFiles: ReleaseFile[] = [];

    try {
      if (!isDirectory(updateContentsPath)) {
        releaseFiles.push({
          sourceLocation: updateContentsPath,
          targetLocation: normalizePath(path.basename(updateContentsPath)), // Put the file in the root
        });
      }
    } catch (error) {
      error.message = error.message + " Make sure you have added the platform you are making a release to.`.";
      reject(error);
    }

    const directoryPath: string = updateContentsPath;
    const baseDirectoryPath = path.join(directoryPath, ".."); // For legacy reasons, put the root directory in the zip

    const files: string[] = await pfs.walk(updateContentsPath);

    files.forEach((filePath: string) => {
      const relativePath: string = path.relative(baseDirectoryPath, filePath);
      releaseFiles.push({
        sourceLocation: filePath,
        targetLocation: normalizePath(relativePath)
      });
    });

    const packagePath: string = path.join(process.cwd(), generateRandomFilename(15) + ".zip");
    const zipFile = new yazl.ZipFile();
    const writeStream: fs.WriteStream = fs.createWriteStream(packagePath);

    zipFile.outputStream.pipe(writeStream)
        .on("error", (error: Error): void => {
            reject(error);
        })
        .on("close", (): void => {

            resolve(packagePath);
        });

    releaseFiles.forEach((releaseFile: ReleaseFile) => {
        zipFile.addFile(releaseFile.sourceLocation, releaseFile.targetLocation);
    });

    zipFile.end();
  });
}
