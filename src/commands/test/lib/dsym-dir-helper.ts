import { TestRunFile } from "./test-manifest";
import * as glob from "glob";
import * as path from "path";

export async function getDSymFile(dSymDir: string): Promise<TestRunFile> {
  if (path.extname(dSymDir) !== ".dSYM") {
    throw new Error("Invalid dSYM directory: name of the directory must have extension *.dSYM");
  }

  const pattern = path.join(dSymDir, "Contents", "Resources", "DWARF", "*");
  const files = await new Promise<string[]>((resolve, reject) => {
    glob(pattern, (err, matches) => {
      if (err) {
        reject(err);
      } else {
        resolve(matches);
      }
    });
  });

  if (files.length === 0) {
    throw new Error(`Invalid dSYM directory: cannot find any symbol file (${pattern})`);
  } else if (files.length > 1) {
    throw new Error(`Invalid dSYM directory: found more than one symbol file (${pattern})`);
  } else {
    const fullPath = files[0].replace(/\//g, path.sep);
    return await TestRunFile.create(fullPath, path.basename(fullPath), "dsym-file");
  }
}
