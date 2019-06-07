import { AppCenterClient, models } from "../../util/apis";
import { AppCommand, CommandResult } from "../../util/commandline";
import { ErrorCodes, failure, success } from "../../util/commandline";
import { hasArg, help, longName, shortName } from "../../util/commandline";
import { out } from "../../util/interaction";
import { inspect } from "util";
import { DefaultApp } from "../../util/profile";
import UploadSymbolsHelper from "./lib/symbols-uploading-helper";
import { SymbolType } from "./lib/symbols-uploading-helper";

import * as Fs from "fs";
import * as Path from "path";

import * as _ from "lodash";

const debug = require("debug")("appcenter-cli:commands:apps:crashes:upload-mappings");

@help("Upload the Android mappings for the application")
export default class UploadMappings extends AppCommand {
  @help("Path to an Android mapping.txt file.")
  @shortName("m")
  @longName("mapping")
  @hasArg
  public mappingPath: string;

  @help("The version name to associate with the mappings.")
  @shortName("n")
  @longName("version-name")
  @hasArg
  public versionName: string;

  @help("The version code to associate with the mappings.")
  @shortName("c")
  @longName("version-code")
  @hasArg
  public versionCode: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const app: DefaultApp = this.app;

    this.validateParameters();

    this.getStatsForFsPath(this.mappingPath);
    if (this.getLowerCasedFileExtension(this.mappingPath) !== ".txt") {
      throw failure(ErrorCodes.InvalidParameter, `path ${this.mappingPath} does not point to valid mapping.txt file`);
    }
    const uploadRequest: models.SymbolUploadBeginRequest = {
      symbolType: SymbolType.AndroidProGuard,
      fileName: "mapping.txt",
      version: this.versionName,
      build: this.versionCode
    };

    // upload mappings
    await out.progress("Uploading mappings...", new UploadSymbolsHelper(client, app, debug).uploadSymbolsArtifact(this.mappingPath, uploadRequest));

    return success();
  }

  private getStatsForFsPath(filePath: string): Fs.Stats | null {
    // take fs entry stats (and check it's existence BTW)
    try {
      debug(`Getting FS statistics for ${filePath}`);
      return Fs.statSync(filePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        // path points to non-existing file system entry
        throw failure(ErrorCodes.InvalidParameter, `path ${filePath} points to non-existent item`);
      } else {
        // other errors
        debug(`Failed to get statistics for file system entry ${filePath} - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `failed to get statistics for file system entry ${filePath}`);
      }
    }
  }

  private getLowerCasedFileExtension(filePath: string): string {
    return Path.extname(filePath).toLowerCase();
  }

  private validateParameters() {
    // check that user have selected all of --mapping, --version-name, and --version-code
    if (_.isNil(this.mappingPath) || _.isNil(this.versionName) || _.isNil(this.versionCode)) {
      throw failure(ErrorCodes.InvalidParameter, "all of '--mapping', '--version-name', and '--version-code' are required");
    }
  }

}
