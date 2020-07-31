import { isNil } from "lodash";
import { AppCenterClient } from "../../../util/apis";
import { AppCommand, CommandArgs, CommandResult, hasArg, help, longName, required, shortName } from "../../../util/commandline";
import ReleaseBinaryCommand from "../release";

const debug = require("debug")("appcenter-cli:commands:distribute:groups:publish");

@help("Publish an app file to a group")
export default class PublishToGroupCommand extends AppCommand {
  @help("Path to binary file")
  @shortName("f")
  @longName("file")
  @required
  @hasArg
  public filePath: string;

  @help("Build version parameter required for .zip, .msi, .pkg and .dmg files")
  @shortName("b")
  @longName("build-version")
  @hasArg
  public buildVersion: string;

  @help("Build number parameter required for macOS .pkg and .dmg files")
  @shortName("n")
  @longName("build-number")
  @hasArg
  public buildNumber: string;

  @help("Distribution group name")
  @shortName("g")
  @longName("group")
  @hasArg
  @required
  public distributionGroup: string;

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
    const releaseArgs = ["--app", this.app.identifier, "--file", this.filePath, "--group", this.distributionGroup];
    if (!isNil(this.buildVersion)) {
      releaseArgs.push("--build-version", this.buildVersion);
    }
    if (!isNil(this.buildNumber)) {
      releaseArgs.push("--build-number", this.buildNumber);
    }
    if (!isNil(this.releaseNotes)) {
      releaseArgs.push("--release-notes", this.releaseNotes);
    }
    if (!isNil(this.releaseNotesFile)) {
      releaseArgs.push("--release-notes-file", this.releaseNotesFile);
    }
    if (!isNil(this.environmentName)) {
      releaseArgs.push("--env", this.environmentName);
    }
    if (!isNil(this.token)) {
      releaseArgs.push("--token", this.token);
    }
    if (this.disableTelemetry) {
      releaseArgs.push("--disable-telemetry");
    }
    // --help and --version end the command execution before it even gets here
    // --debug, --format and --quiet set global variables which remain for the command newly created below

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
