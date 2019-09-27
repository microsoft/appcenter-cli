import { AppCommand, CommandResult, CommandArgs, hasArg, help, longName, required, shortName } from "../../../util/commandline";
import { AppCenterClient } from "../../../util/apis";
import ReleaseBinaryCommand from "../release";
import * as path from "path";

import { isNil } from "lodash";

const debug = require("debug")("appcenter-cli:commands:distribute:stores:publish");

@help("Publish an app file to a store")
export default class PublishToStoreCommand extends AppCommand {
  @help("Path to binary file")
  @shortName("f")
  @longName("file")
  @required
  @hasArg
  public filePath: string;

  @help("Build version parameter required for .zip and .msi files")
  @shortName("b")
  @longName("build-version")
  @hasArg
  public buildVersion: string;

  @help("Store name")
  @shortName("s")
  @longName("store")
  @hasArg
  @required
  public storeName: string;

  @help("Release notes text")
  @shortName("r")
  @longName("release-notes")
  @hasArg
  public releaseNotes: string;

  @help("Path to release notes file")
  @shortName("R")
  @longName("release-notes-file")
  @hasArg
  public releaseNotesFile: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    const releaseArgs = ["--app", this.app.identifier, "--file", this.filePath, "--store", this.storeName];
    if (!isNil(this.buildVersion)) {
      releaseArgs.push("--build-version", this.buildVersion);
    }
    if (!isNil(this.releaseNotes)) {
      releaseArgs.push("--release-notes", this.releaseNotes);
    }
    if (!isNil(this.releaseNotesFile)) {
      releaseArgs.push("--release-notes-file", this.releaseNotesFile);
    }

    // Move from <root>/commands/distribute/stores/publish.ts to <root>/commands/distribute/release.ts
    const releaseCommandPath: string = path.join(path.dirname(path.dirname(this.commandPath)), "release.ts");

    const releaseCommandArgs: CommandArgs = {
      args: releaseArgs,
      command: ["distribute", "release"],
      commandPath: releaseCommandPath
    };

    debug("Forwarding to distribute release command");
    const releaseCommand = new ReleaseBinaryCommand(releaseCommandArgs);
    return releaseCommand.run(client);
  }
}
