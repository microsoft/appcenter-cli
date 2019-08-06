import { CommandResult, hasArg, help, longName, required, shortName } from "../../util/commandline";
import CodePushReleaseCommandBase from "./lib/codepush-release-command-base";
import { AppCenterClient } from "../../util/apis";

@help("Release an update to an app deployment")
export default class CodePushReleaseCommand extends CodePushReleaseCommandBase {
  @help("Path to update contents folder")
  @shortName("c")
  @longName("update-contents-path")
  @required
  @hasArg
  public specifiedUpdateContentsPath: string;

  @help("Semver expression that specifies the binary app version(s) this release is targeting (e.g. 1.1.0, ~1.2.3)")
  @shortName("t")
  @longName("target-binary-version")
  @required
  @hasArg
  public specifiedTargetBinaryVersion: string;

  public async run(client: AppCenterClient): Promise<CommandResult> {
    this.updateContentsPath = this.specifiedUpdateContentsPath;
    this.targetBinaryVersion = this.specifiedTargetBinaryVersion;
    return await this.release(client);
  }
}
