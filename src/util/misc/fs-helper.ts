// Helper functions for file system

import * as fs from "fs";

export function fileExistsSync(filename: string): boolean {
  try {
    return fs.statSync(filename).isFile();
  }
  catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
  return false;
}
