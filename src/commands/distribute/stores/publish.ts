import { isNil } from "lodash";
import { AppCenterClient } from "../../../util/apis";
import { AppCommand, CommandArgs, CommandResult, hasArg, help, longName, required, shortName } from "../../../util/commandline";
import ReleaseBinaryCommand from "../release";

const debug = require("debug")("appcenter-cli:commands:distribute:stores:publish");

@help("Publish an app file to a store")
export default class PublishToStoreCommand extends AppCommand {
  @help("Path to binary file")
  @shortName("f")
  @longName("file")
  @required
  @hasArg
  public filePath: string;

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
    if (!isNil(this.releaseNotes)) {
      releaseArgs.push("--release-notes", this.releaseNotes);
    }
    if (!isNil(this.releaseNotesFile)) {
      releaseArgs.push("--release-notes-file", this.releaseNotesFile);
    }

    const releaseCommandArgs: CommandArgs = {
      args: releaseArgs,
      command: ["distribute", "release"],
      commandPath: undefined,
    };

    debug("Forwarding to distribute release command");
    const releaseCommand = new ReleaseBinaryCommand(releaseCommandArgs);
    return releaseCommand.run(client);
  }
}
