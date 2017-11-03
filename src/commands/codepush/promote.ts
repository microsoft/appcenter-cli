import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, shortName, longName, hasArg, position, name } from "../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../util/apis";
import { out } from "../../util/interaction";

const debug = require("debug")("mobile-center-cli:commands:codepush:promote");

@help("Create a new release for the destination deployment, which includes the exact code and metadata from the latest release of the source deployment")
export default class CodePushPromoteCommand extends AppCommand {
 
  @help("Specifies source deployment name")
  @required
  @name("source-deployment-name")
  @position(0)
  public sourceDeploymentName: string;

  @help("Specifies destination deployment name")
  @required
  @name("dest-deployment-name")
  @position(1)
  public destDeploymentName: string;

  @help("Specifies description of the changes made to the app with this release")
  @shortName("d")
  @longName("description")
  @hasArg
  public description: string;

  @help("Allows you to pick the specified label from the source deployment and promote it to the destination deployment")
  @shortName("l")
  @longName("label")
  @hasArg
  public label: string;

  @help("Specifies whether this release should be considered mandatory. (Putting -m flag means mandatory)")
  @shortName("m")
  public isMandatory: boolean;

  @help("Specifies whether this release should be immediately downloadable. (Putting -x flag means disabled)")
  @shortName("x")
  public isDisabled: boolean;

  @help("Specifies that if the update is identical to the latest release on the deployment, the CLI should generate a warning instead of an error")
  @longName("no-duplicate-release-error")
  public noDuplicateReleaseError: boolean;

  @help("Specifies percentage of users this release should be immediately available to. (The specified number must be an integer between 1 and 100)")
  @shortName("r")
  @longName("rollout")
  @hasArg
  public rollout: string;

  @help("Specifies binary app version(s) that specifies this release is targeting for. (The value must be a semver expression such as 1.1.0, ~1.2.3)")
  @shortName("t")
  @longName("target-binary-version")
  @hasArg
  public targetBinaryRange: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    if (this.rollout != null) {
      if (!/^(100|[1-9][0-9]|[1-9])$/.test(this.rollout)) {
        return failure(ErrorCodes.Exception, `Rollout value should be integer value between ${chalk.bold('0')} or ${chalk.bold('100')}.`);
      }
    }

    
    
  }

}