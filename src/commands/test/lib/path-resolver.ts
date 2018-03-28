import { glob } from "../../../util/misc/promisfied-glob";
import * as path from "path";
import * as fs from "fs";
import * as _ from "lodash";

export class PathResolver {
  readonly workspace: string;

  constructor(workspace: string) {
    this.workspace = workspace;
  }

  public async resolve(pattern: string | string[]): Promise<string[]> {
    if (typeof pattern === "string") {
      return this.resolveSinglePattern(pattern);
    }

    const allFiles = await Promise.all(pattern.map((p) => this.resolveSinglePattern(p))) as _.List<string[]>;
    return _.uniq(_.union.apply(_, allFiles) as _.List<string>).sort();
  }

  private async resolveSinglePattern(pattern: string): Promise<string[]> {
    let workspacePattern = path.join(this.workspace, pattern);

    if (pattern.indexOf("*") === -1) {
      try {
        const stats = fs.statSync(workspacePattern);
        if (stats.isDirectory()) {
          workspacePattern = `${workspacePattern}${path.sep}**`;
        }
      } catch (err) {
        throw new Error(`Cannot access file or directory "${workspacePattern}"`);
      }
    }

    const matches = await glob(workspacePattern);
    const result: string[] = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const validatedRelativePath = await this.validateAndMakeRelative(match);
      if (validatedRelativePath) {
        result.push(validatedRelativePath);
      }
    }

    return result;
  }

  private async validateAndMakeRelative(match: string): Promise<string> {
    const relativePath = path.relative(this.workspace, match);
    const stats = await fs.statSync(match);

    if (stats.isDirectory()) {
      return null;
    }

    if (relativePath.indexOf("..") !== -1) {
      throw new Error("Pattern cannot contain files that are outside of workspace directory");
    }

    return relativePath;
  }
}
