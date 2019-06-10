import { clientRequest, AppCenterClient, models } from "../../util/apis";
import { AppCommand, CommandResult } from "../../util/commandline";
import { ErrorCodes, failure, success } from "../../util/commandline";
import { help, name, position } from "../../util/commandline";
import { inspect } from "util";
import { out } from "../../util/interaction";
import { DefaultApp } from "../../util/profile";
import UploadSymbolsHelper, { SymbolType } from "./lib/symbols-uploading-helper";
import { getSymbolsZipFromXcarchive } from "./lib/subfolder-symbols-helper";
import { createTempFileFromZip } from "./lib/temp-zip-file-helper";
import { mdfind } from "./lib/mdfind";

import * as Pfs from "../../util/misc/promisfied-fs";
import * as Path from "path";

import * as JsZip from "jszip";
import * as JsZipHelper from "../../util/misc/jszip-helper";
import * as _ from "lodash";
import * as Os from "os";
import * as ChildProcess from "child_process";

const debug = require("debug")("appcenter-cli:commands:apps:crashes:upload-missing-symbols");
const bplist = require("bplist");

const MAX_SQL_INTEGER = 2147483647;

@help("Upload missing crash symbols for the application (only from macOS)")
export default class UploadMissingSymbols extends AppCommand {
  @help("Path to a dSYM package or a directory containing dSYM packages")
  @position(0)
  @name("search-path")
  public symbolsPath: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    if (Os.platform() !== "darwin") {
      return failure(ErrorCodes.IllegalCommand, "This command must be run under macOS");
    }

    const app: DefaultApp = this.app;

    await this.validateParameters();

    const missingSymbolsIds: string[] = await out.progress("Getting list of missing symbols...", this.getMissingSymbolsIds(client, app));

    let output: { missingSymbols: number, found: number };
    if (missingSymbolsIds.length) {
      // there are missing symbols - find and upload them
      const uuidToPath = await out.progress("Searching for missing symbols...", this.searchForMissingSymbols(missingSymbolsIds, client, app));
      const found = await out.progress("Uploading found symbols...", this.uploadFoundSymbols(uuidToPath, client, app));

      output = { missingSymbols: missingSymbolsIds.length, found };
    } else {
      output = { missingSymbols: 0, found: 0 };
    }

    out.text((result) => {
      return `${result.missingSymbols} symbols are needed to symbolicate all crashes` + Os.EOL +
             `${result.found} of these symbols were found and uploaded`;
    }, output);

    return success();
  }

  private async validateParameters(): Promise<void> {
    if (!_.isNil(this.symbolsPath)) {
      if (!(await Pfs.exists(this.symbolsPath))) {
         throw failure(ErrorCodes.InvalidParameter, `path ${this.symbolsPath} doesn't exist`);
      }
    }
  }

  private async getMissingSymbolsIds(client: AppCenterClient, app: DefaultApp): Promise<string[]> {
    try {
      const httpResponse = await clientRequest<models.V2MissingSymbolCrashGroupsResponse>((cb) => client.missingSymbolGroups.list(MAX_SQL_INTEGER, app.ownerName, app.appName, cb));
      return _.flatten(httpResponse.result.groups
        .map((crashGroup) => crashGroup.missingSymbols.filter((s) => s.status === "missing").map((s) => s.symbolId)));
    } catch (error) {
      debug(`Failed to get list of missing symbols - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to get list of missing symbols");
    }
  }

  private async searchForMissingSymbols(missingSymbolsIds: string[], client: AppCenterClient, app: DefaultApp): Promise<Map<string, string>> {
    console.assert(missingSymbolsIds.every((id) => /^[0-9a-f]{32}$/g.test(id)), "the API has returned abnormal missing symbols IDs");
    const missingSymbolsUuids: string[] = missingSymbolsIds.map((id) => id.toUpperCase().match(/(.{8})(.{4})(.{4})(.{4})(.{12})/).slice(1).join("-"));

    let uuidToPath: Map<string, string>;
    if (_.isNil(this.symbolsPath)) {
      // symbols path is not specified, looking in default locations
      // searching with mdfind
      uuidToPath = await this.getMdfindResultsForUuids(missingSymbolsUuids);

      // check if all of the missing symbols were found
      const notYetFoundUuids = Array.from(uuidToPath.keys()).filter((key) => _.isNull(uuidToPath.get(key)));
      if (notYetFoundUuids.length) {
        // looking for the rest of missing symbols in Xcode Archive folder
        const xcodeArchivesPath = await this.getXcodeArchiveFolderLocation();
        if (xcodeArchivesPath) {
          // xcode is installed, searching for dSYMs in Archives folder
          uuidToPath = new Map(Array.from(uuidToPath).concat(Array.from(await this.searchDsyms(xcodeArchivesPath, notYetFoundUuids))));
        }
      }
    } else {
      uuidToPath = await this.searchDsyms(this.symbolsPath, _.clone(missingSymbolsUuids));
    }

    return uuidToPath;
  }

  private async uploadFoundSymbols(uuidToPath: Map<string, string>, client: AppCenterClient, app: DefaultApp): Promise<number> {
    // packing and uploading each found dSYM package
    const helper = new UploadSymbolsHelper(client, app, debug);
    const paths = Array.from(uuidToPath.values()).filter((path) => !_.isNull(path)).map((path) => Path.resolve(path));
    const uniquePaths = _.uniq(paths);
    for (const path of uniquePaths) {
      await this.uploadSymbolsZip(path, helper);
    }

    return paths.length;
  }

  private async getMdfindResultsForUuids(uuids: string[]): Promise<Map<string, string | null>> {
    const uuidToPath = new Map<string, string>();
    for (const uuid of uuids) {
      uuidToPath.set(uuid, await this.executeMdfindSearch(uuid));
    }

    return uuidToPath;
  }

  private executeMdfindSearch(uuid: string): Promise<string | null> {
    return new Promise<string>((resolve, reject) => {
      const context = mdfind({query: `com_apple_xcode_dsym_uuids == ${uuid}`});
      let result: string = null;
      context.output
        .on("data", (data: any) => {
          // *.xcarchive symbols have higher priority over non-archive symbols
          result = data.kMDItemPath;
          if (Path.extname(result) === ".xcarchive") {
            // stop search and return xcarchive
            context.terminate();
            resolve(result);
          }
        })
        .on("error", (err: any) => reject(err))
        .on("end", () => resolve(result)); // return what was found (or null if nothing was found)
    }).catch((error) => {
      debug(`Failed to find symbols for ${uuid} using mdfind - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `failed to find symbols for ${uuid} using mdfind`);
    });
  }

  private async getXcodeArchiveFolderLocation(): Promise<string | null> {
    let xcodeSettingsBuffer: Buffer;
    try {
      xcodeSettingsBuffer = await Pfs.readFile(Path.join(Os.homedir(), "Library/Preferences/com.apple.dt.Xcode.plist"));
    } catch (error) {
      if (error.code === "ENOENT") {
        // Xcode settings file not found, most likely xcode is not installed
        return null;
      } else {
        debug(`Failed to read Xcode settings file - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, "failed to read Xcode settings file");
      }
    }

    try {
      const xcodeSettings = await this.parseBinaryPlist(xcodeSettingsBuffer);
      // return default value if custom is not specified
      return xcodeSettings[0].IDECustomDistributionArchivesLocation || Path.join(Os.homedir(), "Library/Developer/Xcode/Archives");
    } catch (error) {
      debug(`Failed to process Xcode settings - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, "failed to process Xcode settings");
    }
  }

  private parseBinaryPlist(buffer: Buffer): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      bplist.parseBuffer(buffer, (error: any, result: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  private async searchDsyms(path: string, uuids: string[]): Promise<Map<string, string>> {
    if (uuids.length) {
      // get list of children entities (and check the existence of path)
      let childrenEntities: string[];
      try {
        childrenEntities = await Pfs.readdir(path);
      } catch (error) {
        if (error.code === "ENOENT" || error.code === "ENOTDIR") {
          return new Map();
        } else {
          throw error;
        }
      }

      let uuidToDsym: Map<string, string>;
      if (Path.extname(path) === ".dSYM") {
        const dSymUuids = await this.extractUuidsFromDsym(path);

        uuidToDsym = new Map();
        for (const dsymUuid of dSymUuids) {
          if (uuids.indexOf(dsymUuid) > -1) {
            // removing found uuid from uuids to quickly stop execution when all of the uuids are found
            _.pull(uuids, dsymUuid);
            uuidToDsym.set(dsymUuid, path);
          }
        }
      } else {
        let childrenEntitiesMaps: Array<[string, string]> = [];
        for (const childrenEntity of childrenEntities) {
          const pathToChildrenEntity = Path.join(path, childrenEntity);
          childrenEntitiesMaps = childrenEntitiesMaps.concat(Array.from(await this.searchDsyms(pathToChildrenEntity, uuids)));
        }
        uuidToDsym = new Map(childrenEntitiesMaps);
      }

      return uuidToDsym;
    } else {
      return new Map();
    }
  }

  private async extractUuidsFromDsym(path: string): Promise<string[]> {
    try {
      const dwarfDumpOutput = await this.runExternalApp(`dwarfdump --uuid "${path}"`);
      return dwarfDumpOutput.match(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/g) || [];
    } catch (error) {
      debug(`Failed to get UUID from dSym ${path} - ${inspect(error)}`);
      throw failure(ErrorCodes.Exception, `failed to get UUID from dSym ${path}`);
    }
  }

  private runExternalApp(command: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      ChildProcess.exec(command, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  private async uploadSymbolsZip(path: string, helper: UploadSymbolsHelper): Promise<void> {
    let zip: JsZip;
    if (Path.extname(path) === ".xcarchive") {
      // *.xcarchive has symbols inside
      zip = await getSymbolsZipFromXcarchive(path, debug);
    } else {
      try {
        zip = new JsZip();
        await JsZipHelper.addFolderToZipRecursively(path, zip);
      } catch (error) {
        debug(`Unable to add ${path} to the ZIP archive - ${inspect(error)}`);
        throw failure(ErrorCodes.Exception, `unable to add ${path} to the ZIP archive`);
      }
    }

    const tempFilePath = await createTempFileFromZip(zip);

    await helper.uploadSymbolsArtifact(tempFilePath, { symbolType: SymbolType.Apple} );
  }
}
