import { AppCommand, CommandArgs, CommandResult, help, failure, ErrorCodes, success, getCurrentApp } from "../../util/commandline";
import { out } from "../../util/interaction";
import { DefaultApp } from "../../util/profile";
import { inspect } from "util";
import { MobileCenterClient, models, clientRequest } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:codepush:deployments:list");

@help("Update the metadata for an existing release")
export default class DeploymentsCommand extends AppCommand {
  constructor(args: CommandArgs) {
    super(args);
  }

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const app = this.app;

    return success();
  }
}