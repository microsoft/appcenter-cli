import * as Fs from "fs";
import * as Request from "request";
import { ErrorCodes, failure } from "../../util/commandline";
import { inspect } from "util";

const debug = require("debug")("appcenter-cli:util:misc:download");

export function downloadFileAndSave(downloadUrl: string, filePath: string): Promise<void> {
  debug(`Downloading file from ${downloadUrl} to the path ${filePath}`);
  return new Promise<void>((resolve, reject) => {
    Request.get(downloadUrl)
    .on("error", (error) => {
      debug(`Failed to download the file from ${downloadUrl} - ${inspect(error)}`);
      reject(failure(ErrorCodes.Exception, `failed to download the file from ${downloadUrl}`));
    })
    .pipe(
      Fs.createWriteStream(filePath)
      .on("error", (error: Error) => {
        debug(`Failed to save the file to ${filePath} - ${inspect(error)}`);
        reject(failure(ErrorCodes.Exception, `failed to save the file to ${filePath}`));
      })
      .on("finish", () => resolve()));
  });
}