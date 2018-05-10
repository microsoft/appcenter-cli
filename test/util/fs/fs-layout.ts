import * as path from "path";
import * as pfs from "../../../src/util/misc/promisfied-fs";

export type IFileSpec = Buffer | string | number[];
export type IDirSpec = { [name: string]: (IDirSpec | IFileSpec) };

/*
  Creates directories and files, described by the spec, and returns
  path to the root directory.

  The spec used by this function is a small subset of specs available in mock-fs (
  https://github.com/tschaub/mock-fs).
  The mock-fs library is much more flexible and does not require access to real file system,
  but the current version interfers with other modules we use, makes tests unstable and increases
  test time about 10 times. If these issues get fixed in the future, we can replace
  this function my mockFs, without significant changes in test code.
*/
export async function createLayout(spec: IDirSpec, root?: string): Promise<string> {
  if (!root) {
    root = await pfs.mkTempDir("fs-layout");
  }

  await createDir(spec, root);

  return root;
}

async function createFile(spec: IFileSpec, filePath: string): Promise<string> {
  await pfs.writeFile(filePath, spec);
  return filePath;
}

async function createDir(spec: IDirSpec, dirPath: string): Promise<string> {
  if (!await pfs.exists(dirPath)) {
    await pfs.mkdir(dirPath);
  }

  for (const name in spec) {
    if (!spec.hasOwnProperty(name)) {
      continue;
    }

    const itemPath = path.join(dirPath, name);
    const itemSpec = spec[name];

    await createItem(itemSpec, itemPath);
  }

  return dirPath;
}

function createItem(itemSpec: IDirSpec | IFileSpec, itemPath: string): Promise<string> {
  if (itemSpec instanceof Array || typeof itemSpec === "string" || itemSpec instanceof Buffer) {
    return createFile(itemSpec, itemPath);
  } else {
    return createDir(itemSpec, itemPath);
  }
}
