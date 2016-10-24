import * as glob from "glob";
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
    
    let allFiles = await Promise.all(pattern.map(p => this.resolveSinglePattern(p)));
    return _.union.apply(_, allFiles).sort();
  }

  private async resolveSinglePattern(pattern: string): Promise<string[]> {
    let workspacePattern = path.join(this.workspace, pattern);
        
    if (pattern.indexOf("*") == -1) {
      let stats = await this.statAsync(workspacePattern);
      if (stats.isDirectory()) {
        workspacePattern = `${workspacePattern}${path.sep}**`; 
      }
    }
    
    let matches = await this.globAsync(workspacePattern);
    let result: string[] = [];

    for (let i = 0; i < matches.length; i++) {
      let match = matches[i];
      let validatedRelativePath = await this.validateAndMakeRelative(match);
      if (validatedRelativePath) {
        result.push(validatedRelativePath);
      }      
    }

    return result;
  }

  private async validateAndMakeRelative(match: string): Promise<string> {
    let relativePath = path.relative(this.workspace, match);
    let stats = await this.statAsync(match);

    if (stats.isDirectory()) {
      return null;
    }

    if (relativePath.indexOf("..") != -1) {
      throw new Error("Pattern cannot contain files that are outside of workspace directory");
    }

    return relativePath;
  }

  private globAsync(pattern: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      glob(pattern, (error, matches) => {
        if (error) {
          reject(error);
        }
        else {
          resolve(matches);
        }
      })
    });
  }

  private statAsync(path: string): Promise<fs.Stats> {
    return new Promise<fs.Stats>((resolve, reject) => {
      fs.stat(path, (error, stats) => {
        if (error) {
          reject(error);
        }
        else {
          resolve(stats);
        }
      })
    });
  }
};