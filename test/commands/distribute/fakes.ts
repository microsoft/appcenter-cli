import { AppCenterClient } from "../../../src/util/apis";
import { AppCommand, CommandResult, hasArg, longName, shortName } from "../../../src/util/commandline";

export class FakeReleaseBinaryCommand extends AppCommand {
  @shortName("f")
  @longName("file")
  @hasArg
  public filePath: string;

  @shortName("b")
  @longName("build-version")
  @hasArg
  public buildVersion: string;

  @shortName("n")
  @longName("build-number")
  @hasArg
  public buildNumber: string;

  @shortName("g")
  @longName("group")
  @hasArg
  public distributionGroup: string;

  @shortName("s")
  @longName("store")
  @hasArg
  public storeName: string;

  @shortName("r")
  @longName("release-notes")
  @hasArg
  public releaseNotes: string;
  @shortName("R")
  @longName("release-notes-file")
  @hasArg
  public releaseNotesFile: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    return null;
  }
}
