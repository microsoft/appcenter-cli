import * as https from "https";
import * as _ from "lodash";
import * as fs from "fs";

export async function getToFile(url: string, filePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    https.get(url, response => {
      let fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', err => {
      fs.unlink(filePath);
      reject(err);
    });
  });
};
