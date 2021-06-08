import { ACFusFile } from "./../ac-fus-uploader-types";
import * as fs from "fs";
import * as Path from "path";

export class ACFile implements ACFusFile {
  private path: string;

  public constructor(path: string) {
    this.path = path;
  }

  get size(): number {
    const stats = fs.statSync(this.path);
    return stats["size"];
  }

  get name(): string {
    return Path.basename(this.path);
  }

  slice(start: number, end: number): Buffer {
    const data = Buffer.alloc(end - start);
    const fd = fs.openSync(this.path, "r");
    fs.readSync(fd, data, 0, data.length, start);
    return data;
  }
}
