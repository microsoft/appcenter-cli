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
    if (Path.extname(this.mappingPath).toLowerCase() !== ".txt") {
      throw failure(ErrorCodes.InvalidParameter, `path ${this.mappingPath} does not point to valid mapping file – only .txt files are supported`);
    }
    const uploadRequest: models.SymbolUploadBeginRequest = {
      symbolType: SymbolType.AndroidProGuard,
      fileName: Path.basename(this.mappingPath),
      version: this.versionName,
      build: String(this.versionCode)
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

  private validateParameters() {
    // check that user have selected all of --mapping, --version-name, and --version-code
    if (_.isNil(this.mappingPath) || _.isNil(this.versionName) || _.isNil(this.versionCode)) {
      throw failure(ErrorCodes.InvalidParameter, "all of '--mapping|-m', '--version-name|-n', and '--version-code|-c' are required");
    } else if (Number.parseInt(this.versionCode, 10) <= 0) {
      throw failure(ErrorCodes.InvalidParameter, "--version-code|-c must be a positive non-zero integer");
    }
  }

}
