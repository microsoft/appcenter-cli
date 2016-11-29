import { CommandArgs, help, name, longName, required, hasArg } from "../../../util/commandLine";
import { RunTestsCommand } from "../lib/run-tests-command";
import * as path from "path";

@help("Submits tests described by a manifest to Mobile Center Test Cloud")
export default class RunManifestTestsCommand extends RunTestsCommand {
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
}