import * as fs from "fs";
import * as pfs from "../../../../util/misc/promisfied-fs";
import * as path from "path";
import * as JsZip from "jszip";
import * as JsZipHelper from "../../../../util/misc/jszip-helper";
import { generateRandomFilename } from "../file-utils";

interface ReleaseFile {
    sourceLocation: string;     // The current location of the file on disk
    targetLocation: string;     // The desired location of the file within the zip
}

export default async function zip(updateContentsPath: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
        let releaseFiles: ReleaseFile[] = [];

        if (!(await pfs.stat(updateContentsPath)).isDirectory()) {
            releaseFiles.push({
                sourceLocation: updateContentsPath,
                targetLocation: path.basename(updateContentsPath)  // Put the file in the root
            });
        }

        const directoryPath: string = updateContentsPath;
        const baseDirectoryPath = path.join(directoryPath, "..");     // For legacy reasons, put the root directory in the zip

        let files: string[] = await pfs.walk(updateContentsPath);

        files.forEach((filePath: string) => {
            var relativePath: string = path.relative(baseDirectoryPath, filePath);
            releaseFiles.push({
                sourceLocation: filePath,
                targetLocation: relativePath
            });
        });

        const packagePath: string = path.join(process.cwd(), generateRandomFilename(15) + ".zip");
        var zip = new JsZip();

        releaseFiles.forEach(async (releaseFile: ReleaseFile) => {
            zip.file(releaseFile.targetLocation, await pfs.readFile(releaseFile.sourceLocation));
        });

        zip
            .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
            .pipe(fs.createWriteStream(packagePath))
            .on('finish', function () {
                resolve(packagePath);
            });
    })
}