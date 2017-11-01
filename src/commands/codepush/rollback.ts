import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, required, shortName, longName, hasArg, position, name } from "../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../util/apis";
import { out } from "../../util/interaction";

const debug = require("debug")("mobile-center-cli:commands:codepush:rollback");

@help("Rollback a deployemnt to a previous release")
export default class RollbackCommand extends AppCommand {

  @help("Specifies deployment name to be rolled back.")
  @required
  @name("deployment-name")
  @position(0)
  public sourceDeploymentName: string;

  @help("Specifies the release label to be rolled back.")
  @longName("target-release")
  @hasArg
  public targetRelease: string;

  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    
  }

}