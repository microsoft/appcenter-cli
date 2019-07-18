import * as http from "http";
import * as https from "https";
import * as fs from "fs";

export async function getToFile(url: string, filePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Workaround for incorrect typings, get method is missing string as option for first parameter
    (https as any).get(url, (response: http.IncomingMessage) => {
      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });
    }).on("error", (err: NodeJS.ErrnoException) => {
      fs.unlink(filePath, function (failed) {
        if (failed) {
          console.error(failed);
        }
      });
      reject(err);
    });
  });
}
