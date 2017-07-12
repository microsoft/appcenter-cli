import * as https from "https";
import * as fs from "fs";
import * as request from "request";
import { ClientResponse } from "../../util/apis/index";

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

function download<T>(uri: string, encoding: string) {
  return new Promise<ClientResponse<T>>((resolve, reject) => {
    request.get(uri, {
      encoding: encoding,
      headers: { "User-Agent": "vs-mobile-center-app" }
    }, (error, response, body: T) => {
      if (error) {
        reject(error);
      } else {
        resolve({ result: body, response });
      }
    });
  });
}

export function downloadFile(uri: string) {
  return download<Buffer>(uri, null);
}

export function downloadString(uri: string) {
  return download<string>(uri, "utf8");
}