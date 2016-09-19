// Command dispatcher

import * as path from "path";

export class Dispatcher {
  private dispatchRoot: string;

  constructor(rootPath: string) {
    this.dispatchRoot = rootPath;
  }

  findCommand(command: string[]): string {
    return null;
  }
}
