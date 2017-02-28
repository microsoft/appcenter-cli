import { CommandArgs, help, name, longName, required, hasArg } from "../../../util/commandline";
import { RunTestsCommand } from "../lib/run-tests-command";
import { Messages } from "../lib/help-messages";
import * as path from "path";

@help(Messages.TestCloud.Commands.RunManifest)
export default class RunManifestTestsCommand extends RunTestsCommand {
  
  @help(Messages.TestCloud.Arguments.AppPath)
  @longName("app-path")
  @hasArg
  appPath: string;

  @help("Path to manifest file")
  @longName("manifest-path")
  @hasArg
  @required
  manifestPath: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  protected async getArtifactsDir(): Promise<string> {
    return path.dirname(this.manifestPath);
  }

  protected async prepareManifest(artifactsDir: string): Promise<string> {
    return this.manifestPath;
  }

  protected async cleanupArtifactsDir(artifactsDir: string): Promise<void> {
  }

  protected getSourceRootDir() {
    return path.dirname(this.manifestPath);
  }

  protected getAppPath()
  {
    return this.appPath;
  }
}